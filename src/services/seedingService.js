import { supabase } from '../lib/supabaseClient';

const HEAT_SIZE = 5;
const TURNOS = ['mañana', 'tarde'];
// Del más lento al más rápido: media_pileta nada medio largo, es el grupo
// más lento de todos, por eso corre primero (mismo criterio que antes con
// rojo→amarillo→verde).
const COLOR_ORDER = ['media_pileta', 'rojo', 'amarillo', 'verde'];

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

// 4 categorías por turno (ya no por año): verde (rápido) > amarillo > rojo
// > media_pileta (el grupo más lento, nada medio largo en vez de 25m
// completos). Sin tiempo básico cargado sigue cayendo en rojo por
// defecto, no en media_pileta — esa categoría es sobre un tiempo real
// medido, no sobre la ausencia de dato.
export function assignColor(tiempoBasico, umbral) {
  if (tiempoBasico == null) return 'rojo';
  if (!umbral) return 'rojo'; // turno sin umbrales configurados todavía
  if (tiempoBasico > umbral.corte_media_pileta) return 'media_pileta';
  if (tiempoBasico > umbral.corte_rojo_amarillo) return 'rojo';
  if (tiempoBasico > umbral.corte_amarillo_verde) return 'amarillo';
  return 'verde';
}

// Arma los heats preliminares leyendo directo de la base. El turno de
// cada alumno viene de su serie actual (cargada en el import). Sin
// tiempo básico cargado, cae en rojo por defecto. Los "no participa"
// quedan afuera, sin rellenar el heat.
export async function generatePreliminarySeries(competitionId) {
  const [{ data: participantRows, error: errP }, umbrales] = await Promise.all([
    supabase
      .from('participants')
      .select(
        'id, series_id, name, tiempo_basico, es_colegio_visitante, participa, series:series_id(year_number, turno)'
      )
      .eq('competition_id', competitionId),
    getUmbrales(),
  ]);
  if (errP) throw errP;

  const umbralPorTurno = Object.fromEntries(umbrales.map((u) => [u.turno, u]));

  // porTurnoAnio['mañana'][3] = [ ...participantes ]
  const porTurnoAnio = {};
  const seriesOrigenIds = new Set();
  for (const p of participantRows) {
    const turno = p.series?.turno;
    const year = p.series?.year_number;
    if (!turno || !year || !p.participa) continue;
    porTurnoAnio[turno] ??= {};
    porTurnoAnio[turno][year] ??= [];
    porTurnoAnio[turno][year].push(p);
    seriesOrigenIds.add(p.series_id);
  }

  const seriesCreadas = [];

  for (const turno of TURNOS) {
    const umbral = umbralPorTurno[turno];

    for (let year = 1; year <= 6; year++) {
      const participantes = porTurnoAnio[turno]?.[year] || [];

      const grupos = { media_pileta: [], rojo: [], amarillo: [], verde: [] };
      for (const p of participantes) {
        const tiempo = p.tiempo_basico != null ? Number(p.tiempo_basico) : null;
        grupos[assignColor(tiempo, umbral)].push({ ...p, tiempo_basico: tiempo });
      }

      let seriesNumberEnAnio = 1;

      for (const color of COLOR_ORDER) {
        // Orden: más lento (tiempo mayor) primero. Sin tiempo_basico van
        // al final del grupo (aplica solo dentro de rojo, que es donde
        // caen por defecto).
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
              turno,
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
              .update({ series_id: nuevaSerie.id, media_pileta: color === 'media_pileta' })
              .eq('id', participante.id);
            if (error) throw error;
          }

          seriesCreadas.push({ ...nuevaSerie, cantidad: heat.length });
        }
      }
    }
  }

  // Limpieza: las series de origen que quedaron vacías se borran (mismo
  // criterio que antes — evita el "Serie 1" fantasma).
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
  const finalesCreadas = [];

  // Una sola consulta para todo (antes se repetía 18 veces, una por cada
  // combinación año×color — con turno hubiera sido 48. Se saca del loop).
  const { data: preliminares, error: errPrelim } = await supabase
    .from('participants')
    .select(
      `id, name, es_colegio_visitante, media_pileta, participa,
       series:series_id(id, year_number, turno, tipo, color),
       results(time)`
    )
    .eq('competition_id', competitionId);
  if (errPrelim) throw errPrelim;

  for (const turno of TURNOS) {
    for (let year = 1; year <= 6; year++) {
      let seriesNumberEnAnio = 1;

      for (const color of COLOR_ORDER) {
        const candidatos = preliminares
          .filter(
            (p) =>
              p.series?.tipo === 'preliminar' &&
              p.series?.turno === turno &&
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
          .eq('turno', turno)
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
              turno,
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
            turno,
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
            media_pileta: c.media_pileta,
            participa: true,
            participante_origen_id: c.id,
          });
          if (error) throw error;
        }

        finalesCreadas.push({ ...nuevaFinal, cantidad: candidatos.length });
      }
    }
  }

  return finalesCreadas;
}
