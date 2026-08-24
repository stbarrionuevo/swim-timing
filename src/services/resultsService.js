import { supabase } from '../lib/supabaseClient'

export async function fetchCompetitionData() {
  const { data: competition, error: competitionError } = await supabase
    .from('competitions')
    .select('*')
    .limit(1)
    .single()

  if (competitionError) {
    throw new Error(
      'No se pudo cargar la competencia. ¿Corriste supabase/schema.sql y scripts/seed.mjs? ' +
        `(${competitionError.message})`
    )
  }

  const { data: seriesRows, error: seriesError } = await supabase
    .from('series')
    .select('*')
    .eq('competition_id', competition.id)

  if (seriesError) throw seriesError

  const { data: participantRows, error: participantsError } = await supabase
    .from('participants')
    .select('*')
    .eq('competition_id', competition.id)

  if (participantsError) throw participantsError

  const participantIds = participantRows.map((p) => p.id)
  let resultRows = []
  if (participantIds.length > 0) {
    const { data, error: resultsError } = await supabase
      .from('results')
      .select('*')
      .in('participant_id', participantIds)
    if (resultsError) throw resultsError
    resultRows = data
  }

  const seriesById = new Map(seriesRows.map((s) => [s.id, s]))
  const resultByParticipantId = new Map(resultRows.map((r) => [r.participant_id, r]))

  const participants = participantRows.map((p) => {
    const seriesRow = seriesById.get(p.series_id)
    const result = resultByParticipantId.get(p.id)
    return {
      id: p.id,
      competitionId: p.competition_id,
      seriesId: p.series_id,
      year: seriesRow?.year_number,
      series: seriesRow?.series_number,
      name: p.name,
      esColegioVisitante: p.es_colegio_visitante,
      participa: p.participa,
      result: {
        time: result ? Number(result.time) : null,
        updatedAt: result ? result.updated_at : null,
      },
    }
  })

  const series = seriesRows.map((s) => ({
    id: s.id,
    year: s.year_number,
    seriesNumber: s.series_number,
  }))

  return {
    competition: {
      id: competition.id,
      name: competition.name,
      event: competition.event,
      date: competition.date,
    },
    series,
    participants,
  }
}


export async function saveParticipantTime(participantId, time, expected = null) {
  if (!expected || expected.time === null) {
    const { data, error } = await supabase
      .from('results')
      .insert({ participant_id: participantId, time })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return buildConflictResult(participantId, await fetchCurrentResult(participantId))
      }
      throw error
    }
    return { ok: true, participantId, time: Number(data.time), updatedAt: data.updated_at }
  }

  const { data, error } = await supabase
    .from('results')
    .update({ time })
    .eq('participant_id', participantId)
    .eq('updated_at', expected.updatedAt)
    .select()

  if (error) throw error

  if (!data || data.length === 0) {
    return buildConflictResult(participantId, await fetchCurrentResult(participantId))
  }

  return { ok: true, participantId, time: Number(data[0].time), updatedAt: data[0].updated_at }
}

async function fetchCurrentResult(participantId) {
  const { data, error } = await supabase
    .from('results')
    .select('*')
    .eq('participant_id', participantId)
    .maybeSingle()
  if (error) throw error
  return data
}

function buildConflictResult(participantId, currentRow) {
  return {
    ok: false,
    participantId,
    currentTime: currentRow ? Number(currentRow.time) : null,
    currentUpdatedAt: currentRow ? currentRow.updated_at : null,
  }
}


export async function setParticipantAbsent(participantId, isAbsent) {
  const { error: updateError } = await supabase
    .from('participants')
    .update({ participa: !isAbsent })
    .eq('id', participantId)

  if (updateError) throw updateError

  if (isAbsent) {
    const { error: deleteError } = await supabase
      .from('results')
      .delete()
      .eq('participant_id', participantId)
    if (deleteError) throw deleteError
  }

  return { participantId, participa: !isAbsent }
}

export async function setParticipantVisitor(participantId, isVisitor) {
  const { error } = await supabase
    .from('participants')
    .update({ es_colegio_visitante: isVisitor })
    .eq('id', participantId)

  if (error) throw error
  return { participantId, esColegioVisitante: isVisitor }
}


export async function addSeries(competitionId, year, seriesNumber) {
  const { data, error } = await supabase
    .from('series')
    .insert({ competition_id: competitionId, year_number: year, series_number: seriesNumber })
    .select()
    .single()

  if (error) throw error
  return { id: data.id, year: data.year_number, seriesNumber: data.series_number }
}


export async function deleteSeries(seriesId) {
  const { error } = await supabase.from('series').delete().eq('id', seriesId)
  if (error) throw error
  return { id: seriesId, deleted: true }
}



export async function createParticipant({ competitionId, seriesId, name, esColegioVisitante }) {
  const { data, error } = await supabase
    .from('participants')
    .insert({
      competition_id: competitionId,
      series_id: seriesId,
      name,
      es_colegio_visitante: !!esColegioVisitante,
    })
    .select()
    .single()
  if (error) throw error
  return data
}


export async function bulkCreateParticipants(rows) {
  const chunkSize = 100
  const inserted = []
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((r) => ({
      competition_id: r.competitionId,
      series_id: r.seriesId,
      name: r.name,
      es_colegio_visitante: !!r.esColegioVisitante,
    }))
    const { data, error } = await supabase.from('participants').insert(chunk).select()
    if (error) throw error
    inserted.push(...data)
  }
  return inserted
}

export async function updateParticipant(participantId, patch) {
  const dbPatch = {}
  if (patch.name !== undefined) dbPatch.name = patch.name
  if (patch.esColegioVisitante !== undefined) dbPatch.es_colegio_visitante = patch.esColegioVisitante
  if (patch.seriesId !== undefined) dbPatch.series_id = patch.seriesId

  const { data, error } = await supabase
    .from('participants')
    .update(dbPatch)
    .eq('id', participantId)
    .select()
    .single()
  if (error) throw error
  return data
}


export async function deleteParticipant(participantId) {
  const { error } = await supabase.from('participants').delete().eq('id', participantId)
  if (error) throw error
  return { id: participantId, deleted: true }
}

export async function updateCompetition(competitionId, patch) {
  const dbPatch = {}
  if (patch.name !== undefined) dbPatch.name = patch.name
  if (patch.event !== undefined) dbPatch.event = patch.event
  if (patch.date !== undefined) dbPatch.date = patch.date

  const { data, error } = await supabase
    .from('competitions')
    .update(dbPatch)
    .eq('id', competitionId)
    .select()
    .single()
  if (error) throw error
  return data
}


export function subscribeToChanges({
  onResultChange,
  onParticipantChange,
  onSeriesChange,
  onStatusChange,
}) {
  const channel = supabase
    .channel('competition-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, onResultChange)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'participants' },
      onParticipantChange
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'series' }, onSeriesChange)
    .subscribe((status) => onStatusChange?.(status))

  return channel
}

export function unsubscribeFromChanges(channel) {
  if (channel) supabase.removeChannel(channel)
}


export function isNetworkError(err) {
  if (!err) return false
  if (typeof TypeError !== 'undefined' && err instanceof TypeError) return true
  return /network|fetch/i.test(err.message || '')
}
