

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


// Arma los heats preliminares leyendo directo de la base: usa el
// tiempo_basico que cada alumno ya trae desde el import normal de
// alumnos (columna "tiempo" opcional en AdminImport). Sin tiempo básico
// cargado, el alumno cae en rojo por defecto (mismo criterio de
// assignColor). Los "no participa" quedan afuera, sin rellenar el heat.
export async function generatePreliminarySeries(competitionId) {
  const [{ data: participantRows, error: errP }, umbrales] = await Promise.all([
    supabase
      .from('participants')
      .select('id, name, tiempo_basico, es_colegio_visitante, participa, series:series_id(year_number)')
      .eq('competition_id', competitionId),
    getUmbrales(),
  ]);
  if (errP) throw errP;

  const umbralPorAnio = Object.fromEntries(umbrales.map((u) => [u.year_number, u]));

  const porAnio = {};
  for (const p of participantRows) {
    const year = p.series?.year_number;
    if (!year || !p.participa) continue;
    if (!porAnio[year]) porAnio[year] = [];
    porAnio[year].push(p);
  }

  const seriesCreadas = [];

  for (let year = 1; year <= 6; year++) {
    const participantes = porAnio[year] || [];
    const umbral = umbralPorAnio[year];

    const grupos = { rojo: [], amarillo: [], verde: [] };
    for (const p of participantes) {
      const tiempo = p.tiempo_basico != null ? Number(p.tiempo_basico) : null;
      grupos[assignColor(tiempo, umbral)].push({ ...p, tiempo_basico: tiempo });
    }

    let seriesNumberEnAnio = 1;

    for (const color of COLOR_ORDER) {
      // Orden: más lento (tiempo mayor) primero. Sin tiempo_basico (ya
      // cayeron en rojo por defecto) van al final del grupo.
      const ordenados = [...grupos[color]].sort((a, b) => {
        if (a.tiempo_basico == null && b.tiempo_basico == null) return 0;
        if (a.tiempo_basico == null) return 1;
        if (b.tiempo_basico == null) return -1;
        return b.tiempo_basico - a.tiempo_basico;
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
          const { error } = await supabase
            .from('participants')
            .update({ series_id: nuevaSerie.id })
            .eq('id', participante.id);
          if (error) throw error;
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
