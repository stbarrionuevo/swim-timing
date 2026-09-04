import { supabase } from '../lib/supabaseClient';

const HEAT_SIZE = 5;
const TURNOS = ['mañana', 'tarde'];

const COLOR_ORDER = ['media_pileta', 'rojo', 'amarillo', 'verde'];


const BLOQUES_POR_TURNO = {
  mañana: ['unico'],
  tarde: ['3_4', '5_6'],
};


function bloqueForYear(turno, year) {
  if (turno === 'mañana') return 'unico';
  return year <= 4 ? '3_4' : '5_6';
}

export async function getUmbrales() {
  const { data, error } = await supabase
    .from('umbrales_color')
    .select('*')
    .order('turno', { ascending: true });
  if (error) throw error;
  return data;
}

export async function upsertUmbral(turno, corteAmarilloVerde, corteRojoAmarillo, corteMediaPileta) {
  if (!(corteAmarilloVerde < corteRojoAmarillo && corteRojoAmarillo < corteMediaPileta)) {
    throw new Error(
      'Los cortes tienen que quedar en orden: amarillo/verde < rojo/amarillo < media pileta'
    );
  }
  const { error } = await supabase.from('umbrales_color').upsert({
    turno,
    corte_amarillo_verde: corteAmarilloVerde,
    corte_rojo_amarillo: corteRojoAmarillo,
    corte_media_pileta: corteMediaPileta,
  });
  if (error) throw error;
}

export function assignColor(tiempoBasico, umbral) {
  if (tiempoBasico == null) return 'rojo';
  if (!umbral) return 'rojo';
  if (tiempoBasico > umbral.corte_media_pileta) return 'media_pileta';
  if (tiempoBasico > umbral.corte_rojo_amarillo) return 'rojo';
  if (tiempoBasico > umbral.corte_amarillo_verde) return 'amarillo';
  return 'verde';
}


export async function generatePreliminarySeries(competitionId) {
  const [{ data: participantRows, error: errP }, umbrales] = await Promise.all([
    supabase
      .from('participants')
      .select(
        'id, series_id, name, year_number, tiempo_basico, es_colegio_visitante, participa, series:series_id(turno)'
      )
      .eq('competition_id', competitionId),
    getUmbrales(),
  ]);
  if (errP) throw errP;

  const umbralPorTurno = Object.fromEntries(umbrales.map((u) => [u.turno, u]));


  const porTurnoBloque = {};
  const seriesOrigenIds = new Set();
  for (const p of participantRows) {
    const turno = p.series?.turno;
    if (!turno || !p.participa) continue;
    if (p.year_number == null) continue;
    const bloque = bloqueForYear(turno, p.year_number);
    porTurnoBloque[turno] ??= {};
    porTurnoBloque[turno][bloque] ??= [];
    porTurnoBloque[turno][bloque].push(p);
    seriesOrigenIds.add(p.series_id);
  }

  const seriesCreadas = [];

  for (const turno of TURNOS) {
    const umbral = umbralPorTurno[turno];

    for (const bloque of BLOQUES_POR_TURNO[turno]) {
      const participantes = porTurnoBloque[turno]?.[bloque] || [];

      const grupos = { media_pileta: [], rojo: [], amarillo: [], verde: [] };
      for (const p of participantes) {
        const tiempo = p.tiempo_basico != null ? Number(p.tiempo_basico) : null;
        grupos[assignColor(tiempo, umbral)].push({ ...p, tiempo_basico: tiempo });
      }

      let seriesNumberEnBloque = 1;

      for (const color of COLOR_ORDER) {
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
              year_number: null,
              turno,
              bloque,
              series_number: seriesNumberEnBloque++,
              tipo: 'preliminar',
              color,
            })
            .select()
            .single();
          if (errSerie) throw errSerie;

          for (const participante of heat) {
            const { error } = await supabase
              .from('participants')
              .update({ series_id: nuevaSerie.id, media_pileta: color === 'media_pileta' })
              .eq('id', participante.id);
            if (error) throw error;
          }

          seriesCreadas.push({ ...nuevaSerie, cantidad: heat.length });
        }
      }
    }
  }

  for (const seriesId of seriesOrigenIds) {
    if (!seriesId) continue;
    const { count, error: errCount } = await supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .eq('series_id', seriesId);
    if (errCount) throw errCount;
    if (count === 0) {
      await supabase.from('series').delete().eq('id', seriesId);
    }
  }

  return seriesCreadas;
}

export async function generateFinalSeries(competitionId) {
  console.log('=== generateFinalSeries INICIADA ===', competitionId);

  const finalesCreadas = [];

  const { data: preliminares, error: errPrelim } = await supabase
    .from('participants')
    .select(
      `id, name, year_number, es_colegio_visitante, media_pileta, participa,
       series:series_id(id, turno, bloque, tipo, color)`
    )
    .eq('competition_id', competitionId);
  if (errPrelim) {
    console.error('Error trayendo preliminares:', errPrelim);
    throw errPrelim;
  }

  const participantIds = preliminares.map((p) => p.id);
  let resultsByParticipantId = new Map();
  if (participantIds.length > 0) {
    const { data: results, error: errResults } = await supabase
      .from('results')
      .select('participant_id, time')
      .in('participant_id', participantIds);
    if (errResults) {
      console.error('Error trayendo resultados:', errResults);
      throw errResults;
    }
    resultsByParticipantId = new Map(results.map((r) => [r.participant_id, r]));
  }

  console.log('Preliminares traídos:', preliminares.length);
  console.log('Ejemplo de participante:', preliminares[0]);
  console.log('Resultados encontrados:', resultsByParticipantId.size);

  for (const turno of TURNOS) {
    for (const bloque of BLOQUES_POR_TURNO[turno]) {
      let seriesNumberEnBloque = 1;

      for (const color of COLOR_ORDER) {
        const candidatos = preliminares
          .filter((p) => {
            const result = resultsByParticipantId.get(p.id);
            return (
              p.series?.tipo === 'preliminar' &&
              p.series?.turno === turno &&
              p.series?.bloque === bloque &&
              p.series?.color === color &&
              p.participa &&
              result?.time != null
            );
          })
          .sort((a, b) => {
            const timeA = resultsByParticipantId.get(a.id)?.time || Infinity;
            const timeB = resultsByParticipantId.get(b.id)?.time || Infinity;
            return timeA - timeB;
          })
          .slice(0, 5);

        console.log(`${turno} / ${bloque} / ${color}: ${candidatos.length} candidatos`);

        if (candidatos.length === 0) continue;

        const { data: finalExistente } = await supabase
          .from('series')
          .select('id, participants(id, results(id))')
          .eq('competition_id', competitionId)
          .eq('turno', turno)
          .eq('bloque', bloque)
          .eq('tipo', 'final')
          .eq('color', color)
          .maybeSingle();

        if (finalExistente) {
          const tieneResultados = finalExistente.participants?.some(
            (p) => p.results && p.results.length > 0
          );
          if (tieneResultados) {
            finalesCreadas.push({
              turno,
              bloque,
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
            year_number: null,
            turno,
            bloque,
            series_number: seriesNumberEnBloque++,
            tipo: 'final',
            color,
          })
          .select()
          .single();
        if (errFinal) {
          console.error('Error creando final:', errFinal);
          throw errFinal;
        }

        for (const c of candidatos) {
          const { error } = await supabase.from('participants').insert({
            competition_id: competitionId,
            series_id: nuevaFinal.id,
            name: c.name,
            year_number: c.year_number,
            es_colegio_visitante: c.es_colegio_visitante,
            media_pileta: c.media_pileta,
            participa: true,
            participante_origen_id: c.id,
          });
          if (error) {
            console.error('Error insertando participante en final:', error);
            throw error;
          }
        }

        finalesCreadas.push({ ...nuevaFinal, cantidad: candidatos.length });
      }
    }
  }

  console.log('=== generateFinalSeries TERMINADA ===', finalesCreadas.length, 'finales');
  return finalesCreadas;
}
