

import { supabase } from '../lib/supabaseClient';

const HEAT_SIZE = 5;
const COLOR_ORDER = ['rojo', 'amarillo', 'verde'];

export async function getUmbrales() {
  const { data, error } = await supabase
    .from('umbrales_color')
    .select('*')
    .order('year_number', { ascending: true });
  if (error) throw error;
  return data;
}

export async function upsertUmbral(yearNumber, corteRojoAmarillo, corteAmarilloVerde) {
  if (corteRojoAmarillo >= corteAmarilloVerde) {
    throw new Error('El corte rojo/amarillo debe ser menor que el corte amarillo/verde');
  }
  const { error } = await supabase
    .from('umbrales_color')
    .upsert({
      year_number: yearNumber,
      corte_rojo_amarillo: corteRojoAmarillo,
      corte_amarillo_verde: corteAmarilloVerde,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}


export function assignColor(tiempoBasico, umbral) {
  if (tiempoBasico == null) return 'rojo';
  if (!umbral) return 'rojo'; // año sin umbrales configurados todavía
  if (tiempoBasico > umbral.corte_rojo_amarillo) return 'rojo';
  if (tiempoBasico > umbral.corte_amarillo_verde) return 'amarillo';
  return 'verde';
}


export async function importBaselineTimes(competitionId, rows) {
  const { data: existentes, error: errQuery } = await supabase
    .from('participants')
    .select('id, name, participa, es_colegio_visitante, series:series_id(year_number)')
    .eq('competition_id', competitionId);
  if (errQuery) throw errQuery;

  const normalize = (s) => (s || '').trim().toLowerCase();

  const participantesPorAnio = {};
  const resumen = { actualizados: 0, creados: 0, errores: [] };

  for (const row of rows) {
    const match = existentes.find(
      (p) =>
        normalize(p.name) === normalize(row.nombre) &&
        p.series?.year_number === row.year_number
    );

    let entry;
    if (match) {
      const { error } = await supabase
        .from('participants')
        .update({ tiempo_basico: row.tiempo_basico })
        .eq('id', match.id);
      if (error) {
        resumen.errores.push({ nombre: row.nombre, error: error.message });
        continue;
      }
      resumen.actualizados++;
      entry = {
        id: match.id,
        nombre: match.name,
        tiempo_basico: row.tiempo_basico,
        es_colegio_visitante: match.es_colegio_visitante,
        participa: match.participa,
      };
    } else {
      resumen.creados++;
      entry = {
        id: null,
        nombre: row.nombre,
        tiempo_basico: row.tiempo_basico,
        es_colegio_visitante: !!row.es_colegio_visitante,
        participa: true,
      };
    }

    if (!participantesPorAnio[row.year_number]) participantesPorAnio[row.year_number] = [];
    participantesPorAnio[row.year_number].push(entry);
  }

  return { participantesPorAnio, resumen };
}


export async function generatePreliminarySeries(competitionId, participantesPorAnio) {
  const umbrales = await getUmbrales();
  const umbralPorAnio = Object.fromEntries(umbrales.map((u) => [u.year_number, u]));

  const seriesCreadas = [];

  for (let year = 1; year <= 6; year++) {
    const participantes = (participantesPorAnio[year] || []).filter((p) => p.participa);
    const umbral = umbralPorAnio[year];

    const grupos = { rojo: [], amarillo: [], verde: [] };
    for (const p of participantes) {
      const color = assignColor(p.tiempo_basico, umbral);
      grupos[color].push(p);
    }

    let seriesNumberEnAnio = 1;

    for (const color of COLOR_ORDER) {

      const ordenados = [...grupos[color]].sort((a, b) => {
        if (a.tiempo_basico == null && b.tiempo_basico == null) return 0;
        if (a.tiempo_basico == null) return 1;
        if (b.tiempo_basico == null) return -1;
        return b.tiempo_basico - a.tiempo_basico; // descendente = más lento primero
      });

      for (let i = 0; i < ordenados.length; i += HEAT_SIZE) {
        const heat = ordenados.slice(i, i + HEAT_SIZE);

        const { data: nuevaSerie, error: errSerie } = await supabase
          .from('series')
          .insert({
            competition_id: competitionId,
            year_number: year,
            series_number: seriesNumberEnAnio++,
            tipo: 'preliminar',
            color,
          })
          .select()
          .single();
        if (errSerie) throw errSerie;

        for (const participante of heat) {
          if (participante.id) {
          
            const { error } = await supabase
              .from('participants')
              .update({ series_id: nuevaSerie.id })
              .eq('id', participante.id);
            if (error) throw error;
          } else {
            // participante nuevo del import, se crea directamente en la serie
            const { error } = await supabase.from('participants').insert({
              competition_id: competitionId,
              series_id: nuevaSerie.id,
              name: participante.nombre,
              tiempo_basico: participante.tiempo_basico,
              es_colegio_visitante: !!participante.es_colegio_visitante,
              participa: true,
            });
            if (error) throw error;
          }
        }

        seriesCreadas.push({ ...nuevaSerie, cantidad: heat.length });
      }
    }
  }

  return seriesCreadas;
}

export async function generateFinalSeries(competitionId) {
  const finalesCreadas = [];

  for (let year = 1; year <= 6; year++) {
    let seriesNumberEnAnio = 1;

    for (const color of COLOR_ORDER) {
  
      const { data: preliminares, error: errPrelim } = await supabase
        .from('participants')
        .select(
          `id, name, es_colegio_visitante, participa,
           series:series_id(id, year_number, tipo, color),
           results(time)`
        )
        .eq('competition_id', competitionId);
      if (errPrelim) throw errPrelim;

      const candidatos = preliminares
        .filter(
          (p) =>
            p.series?.tipo === 'preliminar' &&
            p.series?.year_number === year &&
            p.series?.color === color &&
            p.participa &&
            p.results?.[0]?.time != null
        )
        .sort((a, b) => a.results[0].time - b.results[0].time) // más rápido primero
        .slice(0, 5);

      if (candidatos.length === 0) continue;


      const { data: finalExistente } = await supabase
        .from('series')
        .select('id, participants(id, results(id))')
        .eq('competition_id', competitionId)
        .eq('year_number', year)
        .eq('tipo', 'final')
        .eq('color', color)
        .maybeSingle();

      if (finalExistente) {
        const tieneResultados = finalExistente.participants?.some(
          (p) => p.results && p.results.length > 0
        );
        if (tieneResultados) {
          finalesCreadas.push({
            year,
            color,
            omitido: true,
            motivo: 'Ya tiene resultados cargados, no se sobrescribe',
          });
          continue;
        }

        await supabase.from('participants').delete().eq('series_id', finalExistente.id);
        await supabase.from('series').delete().eq('id', finalExistente.id);
      }

      const { data: nuevaFinal, error: errFinal } = await supabase
        .from('series')
        .insert({
          competition_id: competitionId,
          year_number: year,
          series_number: seriesNumberEnAnio++,
          tipo: 'final',
          color,
        })
        .select()
        .single();
      if (errFinal) throw errFinal;

      for (const c of candidatos) {
        const { error } = await supabase.from('participants').insert({
          competition_id: competitionId,
          series_id: nuevaFinal.id,
          name: c.name,
          es_colegio_visitante: c.es_colegio_visitante,
          participa: true,
          participante_origen_id: c.id,
        });
        if (error) throw error;
      }

      finalesCreadas.push({ ...nuevaFinal, cantidad: candidatos.length });
    }
  }

  return finalesCreadas;
}
