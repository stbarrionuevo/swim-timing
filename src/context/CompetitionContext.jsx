import { createContext, useContext, useEffect, useMemo, useReducer, useCallback } from 'react'
import * as dataService from '../services/resultsService'
import * as seedingService from '../services/seedingService'
import * as offlineQueue from '../lib/offlineQueue'

const CompetitionContext = createContext(null)

// Mañana: un solo bloque (los 4 años comparten pileta). Tarde: dos
// bloques, porque nunca coinciden los 4 años en el agua (contextTurnoTarde.md).
const BLOQUES_POR_TURNO = {
  mañana: ['unico'],
  tarde: ['3_4', '5_6'],
}

// A qué bloque pertenece un año. Se deriva automático — no hace falta
// que nadie lo cargue a mano en el import ni en el admin.
export function bloqueForYear(turno, year) {
  if (turno === 'mañana') return 'unico'
  return year <= 4 ? '3_4' : '5_6'
}

const initialState = {
  status: 'loading',
  error: null,
  competition: null,
  series: [], 
  participants: [],
  liveStatus: 'connecting',
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  pendingCount: 0,
  conflicts: {},
}

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, status: 'loading', error: null }
    case 'LOAD_SUCCESS':
      return {
        ...state,
        status: 'ready',
        error: null,
        competition: action.competition,
        series: action.series,
        participants: action.participants,
      }
    case 'LOAD_ERROR':
      return { ...state, status: 'error', error: action.error }
    case 'SAVE_TIME':
   
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId
            ? { ...p, result: { time: action.time, updatedAt: action.updatedAt, pending: false } }
            : p
        ),
      }
    case 'QUEUE_TIME':

      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId
            ? { ...p, result: { time: action.time, updatedAt: p.result.updatedAt, pending: true } }
            : p
        ),
      }
    case 'SET_ABSENT':
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId
            ? {
                ...p,
                participa: !action.isAbsent,
                result: action.isAbsent ? { time: null, updatedAt: null, pending: false } : p.result,
                pendingSync: false,
              }
            : p
        ),
      }
    case 'QUEUE_ABSENT':
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId
            ? {
                ...p,
                participa: !action.isAbsent,
                result: action.isAbsent ? { time: null, updatedAt: null, pending: false } : p.result,
                pendingSync: true,
              }
            : p
        ),
      }
    case 'SET_VISITOR':
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId
            ? { ...p, esColegioVisitante: action.isVisitor, pendingSync: false }
            : p
        ),
      }
    case 'QUEUE_VISITOR':
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId
            ? { ...p, esColegioVisitante: action.isVisitor, pendingSync: true }
            : p
        ),
      }
    case 'ADD_SERIES':
      if (state.series.some((s) => s.id === action.series.id)) return state
      return { ...state, series: [...state.series, action.series] }
    case 'DELETE_SERIES':
      return {
        ...state,
        series: state.series.filter((s) => s.id !== action.seriesId),
        participants: state.participants.filter((p) => p.seriesId !== action.seriesId),
      }
    case 'SYNC_PARTICIPANT': {
      // Cuando seedingService mueve a un alumno de serie (para armar los
      // heats de color), Realtime avisa acá. Sin esto, la pantalla se
      // queda mostrando al alumno en la serie vieja hasta un refresh
      // manual — mismo patrón que el bug de estado stale del cronómetro.
      const seriesRow =
        action.seriesId !== undefined ? state.series.find((s) => s.id === action.seriesId) : null
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId
            ? {
                ...p,
                participa: action.participa,
                esColegioVisitante: action.esColegioVisitante,
                pendingSync: false,
                ...(action.mediaPileta !== undefined ? { mediaPileta: action.mediaPileta } : {}),
                ...(seriesRow
                  ? {
                      seriesId: seriesRow.id,
                      turno: seriesRow.turno,
                      bloque: seriesRow.bloque,
                      series: seriesRow.seriesNumber,
                    }
                  : {}),
              }
            : p
        ),
      }
    }
    case 'CLEAR_RESULT':
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId
            ? { ...p, result: { time: null, updatedAt: null, pending: false } }
            : p
        ),
      }
    case 'LIVE_STATUS':
      return { ...state, liveStatus: action.status }
    case 'ONLINE_STATUS':
      return { ...state, isOnline: action.isOnline }
    case 'PENDING_COUNT':
      return { ...state, pendingCount: action.count }
    case 'SET_CONFLICT':
      return {
        ...state,
        conflicts: {
          ...state.conflicts,
          [action.participantId]: {
            attempted: action.attempted,
            current: action.current,
            currentUpdatedAt: action.currentUpdatedAt,
          },
        },
      }
    case 'CLEAR_CONFLICT': {
      const next = { ...state.conflicts }
      delete next[action.participantId]
      return { ...state, conflicts: next }
    }
    case 'ADD_PARTICIPANT':

      if (state.participants.some((p) => p.id === action.participant.id)) return state
      return { ...state, participants: [...state.participants, action.participant] }
    case 'ADD_PARTICIPANTS_BULK': {

      const existingIds = new Set(state.participants.map((p) => p.id))
      const toAdd = action.participants.filter((p) => !existingIds.has(p.id))
      return { ...state, participants: [...state.participants, ...toAdd] }
    }
    case 'PARTICIPANT_INSERTED': {

      const row = action.row
      if (state.participants.some((p) => p.id === row.id)) return state
      const seriesRow = state.series.find((s) => s.id === row.series_id)
      if (!seriesRow) return state 
      return {
        ...state,
        participants: [
          ...state.participants,
          {
            id: row.id,
            competitionId: row.competition_id,
            seriesId: row.series_id,
            // El año viaja con el participante (tag propio), no con la serie.
            year: row.year_number,
            turno: seriesRow.turno,
            bloque: seriesRow.bloque,
            series: seriesRow.seriesNumber,
            name: row.name,
            esColegioVisitante: row.es_colegio_visitante,
            mediaPileta: row.media_pileta,
            participa: row.participa,
            result: { time: null, updatedAt: null, pending: false },
          },
        ],
      }
    }
    case 'UPDATE_PARTICIPANT':
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId ? { ...p, ...action.patch } : p
        ),
      }
    case 'REMOVE_PARTICIPANT':
      return { ...state, participants: state.participants.filter((p) => p.id !== action.participantId) }
    case 'UPDATE_COMPETITION':
      return { ...state, competition: { ...state.competition, ...action.patch } }
    default:
      return state
  }
}

export function CompetitionProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const reload = useCallback(async () => {
    dispatch({ type: 'LOAD_START' })
    try {
      const { competition, series, participants } = await dataService.fetchCompetitionData()
      dispatch({ type: 'LOAD_SUCCESS', competition, series, participants })
    } catch (err) {
      dispatch({ type: 'LOAD_ERROR', error: err.message || String(err) })
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])


  useEffect(() => {
    const channel = dataService.subscribeToChanges({
      onResultChange: (payload) => {
        if (payload.eventType === 'DELETE') {
          dispatch({ type: 'CLEAR_RESULT', participantId: payload.old.participant_id })
        } else {
          const row = payload.new
          dispatch({
            type: 'SAVE_TIME',
            participantId: row.participant_id,
            time: Number(row.time),
            updatedAt: row.updated_at,
          })
        }
      },
      onParticipantChange: (payload) => {
        if (payload.eventType === 'DELETE') {
          dispatch({ type: 'REMOVE_PARTICIPANT', participantId: payload.old.id })
          return
        }
        if (payload.eventType === 'INSERT') {
          dispatch({ type: 'PARTICIPANT_INSERTED', row: payload.new })
          return
        }
        const row = payload.new
        dispatch({
          type: 'SYNC_PARTICIPANT',
          participantId: row.id,
          participa: row.participa,
          esColegioVisitante: row.es_colegio_visitante,
          seriesId: row.series_id,
          mediaPileta: row.media_pileta,
        })
      },
      onSeriesChange: (payload) => {
        if (payload.eventType === 'DELETE') {
          dispatch({ type: 'DELETE_SERIES', seriesId: payload.old.id })
        } else if (payload.eventType === 'INSERT') {
          const row = payload.new
          dispatch({
            type: 'ADD_SERIES',
            series: {
              id: row.id,
              turno: row.turno,
              bloque: row.bloque,
              seriesNumber: row.series_number,
              tipo: row.tipo,
              color: row.color,
            },
          })
        }
      },
      onStatusChange: (status) => {
        dispatch({
          type: 'LIVE_STATUS',
          status: status === 'SUBSCRIBED' ? 'connected' : status === 'CLOSED' ? 'connecting' : 'error',
        })
      },
    })

    return () => dataService.unsubscribeFromChanges(channel)
  }, [])


  const flushQueue = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    const queue = offlineQueue.getQueue()
    for (const op of queue) {
      try {
        if (op.type === 'time') {
          const result = await dataService.saveParticipantTime(op.participantId, op.time, op.expected)
          if (result.ok) {
            dispatch({
              type: 'SAVE_TIME',
              participantId: op.participantId,
              time: result.time,
              updatedAt: result.updatedAt,
            })
          } else if (result.currentTime === null) {
            dispatch({ type: 'CLEAR_RESULT', participantId: op.participantId })
            dispatch({
              type: 'SET_CONFLICT',
              participantId: op.participantId,
              attempted: op.time,
              current: null,
              currentUpdatedAt: null,
            })
          } else {
            dispatch({
              type: 'SAVE_TIME',
              participantId: op.participantId,
              time: result.currentTime,
              updatedAt: result.currentUpdatedAt,
            })
            dispatch({
              type: 'SET_CONFLICT',
              participantId: op.participantId,
              attempted: op.time,
              current: result.currentTime,
              currentUpdatedAt: result.currentUpdatedAt,
            })
          }
        } else if (op.type === 'absent') {
          await dataService.setParticipantAbsent(op.participantId, op.isAbsent)
          dispatch({ type: 'SET_ABSENT', participantId: op.participantId, isAbsent: op.isAbsent })
        } else if (op.type === 'visitor') {
          await dataService.setParticipantVisitor(op.participantId, op.isVisitor)
          dispatch({ type: 'SET_VISITOR', participantId: op.participantId, isVisitor: op.isVisitor })
        }
        offlineQueue.removeFromQueue(op.id)
      } catch (err) {
        if (dataService.isNetworkError(err)) {
   
          break
        }
 
        offlineQueue.removeFromQueue(op.id)
      }
    }
    dispatch({ type: 'PENDING_COUNT', count: offlineQueue.getQueue().length })
  }, [])

  useEffect(() => {
    dispatch({ type: 'PENDING_COUNT', count: offlineQueue.getQueue().length })
    flushQueue()

    function handleOnline() {
      dispatch({ type: 'ONLINE_STATUS', isOnline: true })
      flushQueue()
    }
    function handleOffline() {
      dispatch({ type: 'ONLINE_STATUS', isOnline: false })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [flushQueue])



  const saveTime = useCallback(async (participantId, time, expected) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueue.enqueue({ type: 'time', participantId, time, expected })
      dispatch({ type: 'QUEUE_TIME', participantId, time })
      dispatch({ type: 'PENDING_COUNT', count: offlineQueue.getQueue().length })
      return { ok: true, queued: true, time }
    }

    try {
      const result = await dataService.saveParticipantTime(participantId, time, expected)
      if (result.ok) {
        dispatch({
          type: 'SAVE_TIME',
          participantId,
          time: result.time,
          updatedAt: result.updatedAt,
        })
        dispatch({ type: 'CLEAR_CONFLICT', participantId })
      } else {
        if (result.currentTime === null) {
          dispatch({ type: 'CLEAR_RESULT', participantId })
        } else {
          dispatch({
            type: 'SAVE_TIME',
            participantId,
            time: result.currentTime,
            updatedAt: result.currentUpdatedAt,
          })
        }
        dispatch({
          type: 'SET_CONFLICT',
          participantId,
          attempted: time,
          current: result.currentTime,
          currentUpdatedAt: result.currentUpdatedAt,
        })
      }
      return result
    } catch (err) {
      if (dataService.isNetworkError(err)) {
        offlineQueue.enqueue({ type: 'time', participantId, time, expected })
        dispatch({ type: 'QUEUE_TIME', participantId, time })
        dispatch({ type: 'PENDING_COUNT', count: offlineQueue.getQueue().length })
        return { ok: true, queued: true, time }
      }
      throw err
    }
  }, [])

  const resolveConflict = useCallback(
    async (participantId, choice) => {
      const conflict = state.conflicts[participantId]
      if (!conflict) return
      dispatch({ type: 'CLEAR_CONFLICT', participantId })
      if (choice === 'theirs') return

      await saveTime(participantId, conflict.attempted, {
        time: conflict.current,
        updatedAt: conflict.currentUpdatedAt,
      })
    },
    [state.conflicts, saveTime]
  )

  const getConflict = useCallback(
    (participantId) => state.conflicts[participantId] || null,
    [state.conflicts]
  )

  const setAbsent = useCallback(async (participantId, isAbsent) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueue.enqueue({ type: 'absent', participantId, isAbsent })
      dispatch({ type: 'QUEUE_ABSENT', participantId, isAbsent })
      dispatch({ type: 'PENDING_COUNT', count: offlineQueue.getQueue().length })
      return
    }
    try {
      await dataService.setParticipantAbsent(participantId, isAbsent)
      dispatch({ type: 'SET_ABSENT', participantId, isAbsent })
    } catch (err) {
      if (dataService.isNetworkError(err)) {
        offlineQueue.enqueue({ type: 'absent', participantId, isAbsent })
        dispatch({ type: 'QUEUE_ABSENT', participantId, isAbsent })
        dispatch({ type: 'PENDING_COUNT', count: offlineQueue.getQueue().length })
        return
      }
      throw err
    }
  }, [])

  const setVisitor = useCallback(async (participantId, isVisitor) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      offlineQueue.enqueue({ type: 'visitor', participantId, isVisitor })
      dispatch({ type: 'QUEUE_VISITOR', participantId, isVisitor })
      dispatch({ type: 'PENDING_COUNT', count: offlineQueue.getQueue().length })
      return
    }
    try {
      await dataService.setParticipantVisitor(participantId, isVisitor)
      dispatch({ type: 'SET_VISITOR', participantId, isVisitor })
    } catch (err) {
      if (dataService.isNetworkError(err)) {
        offlineQueue.enqueue({ type: 'visitor', participantId, isVisitor })
        dispatch({ type: 'QUEUE_VISITOR', participantId, isVisitor })
        dispatch({ type: 'PENDING_COUNT', count: offlineQueue.getQueue().length })
        return
      }
      throw err
    }
  }, [])

  // La clave de una serie pasa a ser turno + bloque (ya no año): el año
  // mezcla dentro del bloque. addSeries crea series tipo 'normal' por
  // default (mismo criterio que antes, vía default de la tabla).
  const addSeries = useCallback(
    async (turno, bloque, seriesNumber) => {
      if (!state.competition) return
      const series = await dataService.addSeries(state.competition.id, turno, bloque, seriesNumber)
      dispatch({ type: 'ADD_SERIES', series })
      return series
    },
    [state.competition]
  )

  const deleteSeries = useCallback(async (seriesId) => {
    await dataService.deleteSeries(seriesId)
    dispatch({ type: 'DELETE_SERIES', seriesId })
  }, [])

  // Busca/crea una serie 'normal' (la vía manual del admin) por
  // turno+bloque+numero. Filtra por tipo 'normal' para no confundirse
  // con una serie preliminar/final que casualmente comparta numeración.
  const findOrCreateSeries = useCallback(
    async (turno, bloque, seriesNumber) => {
      const existing = state.series.find(
        (s) =>
          s.turno === turno &&
          s.bloque === bloque &&
          s.seriesNumber === seriesNumber &&
          (s.tipo || 'normal') === 'normal'
      )
      if (existing) return existing
      return addSeries(turno, bloque, seriesNumber)
    },
    [state.series, addSeries]
  )

  // year es un tag propio del alumno — ya no determina la serie por sí
  // solo, pero sí determina automáticamente el bloque (contextTurnoTarde.md).
  const createParticipant = useCallback(
    async ({ year, turno, seriesNumber, name, esColegioVisitante }) => {
      if (!state.competition) throw new Error('Todavía no se cargó la competencia.')
      const bloque = bloqueForYear(turno, year)
      const series = await findOrCreateSeries(turno, bloque, seriesNumber)
      const row = await dataService.createParticipant({
        competitionId: state.competition.id,
        seriesId: series.id,
        yearNumber: year,
        name,
        esColegioVisitante,
      })
      const participant = {
        id: row.id,
        competitionId: row.competition_id,
        seriesId: row.series_id,
        year,
        turno,
        bloque,
        series: seriesNumber,
        name: row.name,
        esColegioVisitante: row.es_colegio_visitante,
        mediaPileta: row.media_pileta,
        participa: row.participa,
        result: { time: null, updatedAt: null, pending: false },
      }
      dispatch({ type: 'ADD_PARTICIPANT', participant })
      return participant
    },
    [state.competition, findOrCreateSeries]
  )

  const updateParticipant = useCallback(
    async (participantId, patch) => {

      const dbPatch = {
        name: patch.name,
        esColegioVisitante: patch.esColegioVisitante,
        mediaPileta: patch.mediaPileta,
        yearNumber: patch.year,
      }
      let extra = {}
      if (patch.year !== undefined && patch.turno !== undefined && patch.seriesNumber !== undefined) {
        const bloque = bloqueForYear(patch.turno, patch.year)
        const series = await findOrCreateSeries(patch.turno, bloque, patch.seriesNumber)
        dbPatch.seriesId = series.id
        extra = {
          turno: patch.turno,
          bloque,
          series: patch.seriesNumber,
          seriesId: series.id,
        }
      }
      await dataService.updateParticipant(participantId, dbPatch)
      dispatch({
        type: 'UPDATE_PARTICIPANT',
        participantId,
        patch: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.esColegioVisitante !== undefined
            ? { esColegioVisitante: patch.esColegioVisitante }
            : {}),
          ...(patch.mediaPileta !== undefined ? { mediaPileta: patch.mediaPileta } : {}),
          ...(patch.year !== undefined ? { year: patch.year } : {}),
          ...extra,
        },
      })
    },
    [findOrCreateSeries]
  )

  const deleteParticipant = useCallback(async (participantId) => {
    await dataService.deleteParticipant(participantId)
    dispatch({ type: 'REMOVE_PARTICIPANT', participantId })
  }, [])

  const updateCompetition = useCallback(
    async (patch) => {
      if (!state.competition) return
      await dataService.updateCompetition(state.competition.id, patch)
      dispatch({ type: 'UPDATE_COMPETITION', patch })
    },
    [state.competition]
  )


  const importParticipants = useCallback(
    async (rows) => {
      if (!state.competition) throw new Error('Todavía no se cargó la competencia.')

      // La serie "de aterrizaje" del import se arma por turno+bloque+numero
      // (bloque derivado del año de cada fila). generatePreliminarySeries
      // después reparte a todos por color, sin importar en qué serie
      // hayan entrado acá.
      const seriesKeys = [
        ...new Set(rows.map((r) => `${r.turno}-${bloqueForYear(r.turno, r.year)}-${r.seriesNumber}`)),
      ]
      const seriesByKey = new Map()
      let createdSeriesCount = 0
      for (const key of seriesKeys) {
        const [turno, bloque, seriesNumberStr] = key.split('-')
        const seriesNumber = Number(seriesNumberStr)
        const existed = state.series.some(
          (s) =>
            s.turno === turno &&
            s.bloque === bloque &&
            s.seriesNumber === seriesNumber &&
            (s.tipo || 'normal') === 'normal'
        )
        const series = await findOrCreateSeries(turno, bloque, seriesNumber)
        if (!existed) createdSeriesCount++
        seriesByKey.set(key, series)
      }

      const toInsert = rows.map((r) => {
        const bloque = bloqueForYear(r.turno, r.year)
        const series = seriesByKey.get(`${r.turno}-${bloque}-${r.seriesNumber}`)
        return {
          competitionId: state.competition.id,
          seriesId: series.id,
          year: r.year,
          name: r.name,
          esColegioVisitante: r.esColegioVisitante,
          tiempoBasico: r.tiempoBasico ?? null,
        }
      })

      const insertedRows = await dataService.bulkCreateParticipants(toInsert)


      const participants = insertedRows.map((row, i) => {
        const original = rows[i]
        return {
          id: row.id,
          competitionId: row.competition_id,
          seriesId: row.series_id,
          year: original?.year,
          turno: original?.turno,
          bloque: bloqueForYear(original?.turno, original?.year),
          series: original?.seriesNumber,
          name: row.name,
          esColegioVisitante: row.es_colegio_visitante,
          mediaPileta: row.media_pileta,
          participa: row.participa,
          result: { time: null, updatedAt: null, pending: false },
        }
      })

      dispatch({ type: 'ADD_PARTICIPANTS_BULK', participants })
      return { importedCount: participants.length, createdSeriesCount }
    },
    [state.competition, state.series, findOrCreateSeries]
  )



  // Lista de series de un turno+bloque, sin filtrar por año (una serie
  // ahora puede mezclar años dentro del mismo bloque). tipo es opcional:
  // sin pasarlo, trae todas (normal + preliminar + final juntas, para la
  // pantalla de carga de tiempos); pasando 'preliminar' o 'final' filtra
  // solo esas.
  const getSeriesListForBloque = useCallback(
    (turno, bloque, tipo) =>
      state.series
        .filter(
          (s) =>
            s.turno === turno &&
            s.bloque === bloque &&
            (tipo === undefined || (s.tipo || 'normal') === tipo)
        )
        .sort((a, b) => a.seriesNumber - b.seriesNumber)
        .map((s) => {
          const participants = state.participants.filter((p) => p.seriesId === s.id)
          const activeParticipants = participants.filter((p) => p.participa)
          const loaded = activeParticipants.filter((p) => p.result.time !== null)
          let status = 'pendiente'
          if (loaded.length > 0 && loaded.length < activeParticipants.length) {
            status = 'en-progreso'
          } else if (activeParticipants.length > 0 && loaded.length === activeParticipants.length) {
            status = 'completada'
          }
          const years = [...new Set(participants.map((p) => p.year).filter((y) => y != null))].sort(
            (a, b) => a - b
          )
          return {
            id: s.id,
            turno,
            bloque,
            seriesNumber: s.seriesNumber,
            tipo: s.tipo || 'normal',
            color: s.color || null,
            years,
            participantCount: participants.length,
            loadedCount: loaded.length,
            activeCount: activeParticipants.length,
            status,
          }
        }),
    [state.series, state.participants]
  )

  // Se resuelve por seriesId (no por número), así no hay ambigüedad si
  // dos series de tipo distinto comparten turno+bloque+numero.
  const getParticipantsForSeriesId = useCallback(
    (seriesId) =>
      state.participants
        .filter((p) => p.seriesId === seriesId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.participants]
  )

  // El ranking "por curso" sigue siendo por año únicamente, mezclando
  // turno y bloque: compite el tiempo real nadado. Turno/bloque son solo
  // criterio de organización/siembra, no de competencia.
  const getRankingForYear = useCallback(
    (year) =>
      state.participants
        .filter((p) => p.year === year && p.participa && p.result.time !== null)
        .sort((a, b) => a.result.time - b.result.time),
    [state.participants]
  )

  const getRankingGeneral = useCallback(
    () =>
      state.participants
        .filter((p) => p.participa && p.result.time !== null)
        .sort((a, b) => a.result.time - b.result.time),
    [state.participants]
  )

  // Ranking general de un turno+bloque completo, mezclando años (cada
  // fila lleva su propio p.year como tag para mostrar en pantalla).
  const getRankingGeneralBloque = useCallback(
    (turno, bloque) =>
      state.participants
        .filter(
          (p) => p.turno === turno && p.bloque === bloque && p.participa && p.result.time !== null
        )
        .sort((a, b) => a.result.time - b.result.time),
    [state.participants]
  )

  // Ranking de una final puntual (turno+bloque+color) — mezcla años.
  const getRankingFinalColor = useCallback(
    (turno, bloque, color) => {
      const finalSeriesIds = new Set(
        state.series
          .filter(
            (s) => s.turno === turno && s.bloque === bloque && s.tipo === 'final' && s.color === color
          )
          .map((s) => s.id)
      )
      return state.participants
        .filter((p) => finalSeriesIds.has(p.seriesId) && p.participa && p.result.time !== null)
        .sort((a, b) => a.result.time - b.result.time)
    },
    [state.series, state.participants]
  )

  // ---------------------------------------------------------------------
  // Siembra por colores (rojo/amarillo/verde/media_pileta) — wrappers de
  // seedingService. Umbrales fijos por turno (mañana/tarde), no por año
  // ni por bloque (los dos bloques de tarde comparten umbral).
  // ---------------------------------------------------------------------

  const getUmbrales = useCallback(() => seedingService.getUmbrales(), [])

  const upsertUmbral = useCallback(
    (turno, corteAmarilloVerde, corteRojoAmarillo, corteMediaPileta) =>
      seedingService.upsertUmbral(turno, corteAmarilloVerde, corteRojoAmarillo, corteMediaPileta),
    []
  )

  // Las series/participantes que crea esto llegan solas por Realtime —
  // no hace falta dispatch manual acá ni en generateFinalSeries. Agrupa
  // por turno×bloque×color leyendo directo de la base.
  const generatePreliminarySeries = useCallback(async () => {
    if (!state.competition) throw new Error('Todavía no se cargó la competencia.')
    return seedingService.generatePreliminarySeries(state.competition.id)
  }, [state.competition])

  const generateFinalSeries = useCallback(async () => {
    if (!state.competition) throw new Error('Todavía no se cargó la competencia.')
    return seedingService.generateFinalSeries(state.competition.id)
  }, [state.competition])

  const value = useMemo(
    () => ({
      status: state.status,
      error: state.error,
      competition: state.competition,
      liveStatus: state.liveStatus,
      isOnline: state.isOnline,
      pendingCount: state.pendingCount,
      years: [3, 4, 5, 6],
      turnos: ['mañana', 'tarde'],
      bloquesPorTurno: BLOQUES_POR_TURNO,
      bloqueForYear,
      reload,
      saveTime,
      setAbsent,
      setVisitor,
      addSeries,
      deleteSeries,
      resolveConflict,
      getConflict,
      createParticipant,
      updateParticipant,
      deleteParticipant,
      updateCompetition,
      importParticipants,
      getSeriesListForBloque,
      getParticipantsForSeriesId,
      getRankingForYear,
      getRankingGeneral,
      getRankingGeneralBloque,
      getRankingFinalColor,
      getUmbrales,
      upsertUmbral,
      generatePreliminarySeries,
      generateFinalSeries,
    }),
    [
      state.status,
      state.error,
      state.competition,
      state.liveStatus,
      state.isOnline,
      state.pendingCount,
      reload,
      saveTime,
      setAbsent,
      setVisitor,
      addSeries,
      deleteSeries,
      resolveConflict,
      getConflict,
      createParticipant,
      updateParticipant,
      deleteParticipant,
      updateCompetition,
      importParticipants,
      getSeriesListForBloque,
      getParticipantsForSeriesId,
      getRankingForYear,
      getRankingGeneral,
      getRankingGeneralBloque,
      getRankingFinalColor,
      getUmbrales,
      upsertUmbral,
      generatePreliminarySeries,
      generateFinalSeries,
    ]
  )

  return (
    <CompetitionContext.Provider value={value}>{children}</CompetitionContext.Provider>
  )
}

export function useCompetition() {
  const ctx = useContext(CompetitionContext)
  if (!ctx) throw new Error('useCompetition debe usarse dentro de CompetitionProvider')
  return ctx
}
