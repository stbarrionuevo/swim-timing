import { useEffect, useRef, useState } from 'react'
import { useCompetition } from '../context/CompetitionContext'
import Icon from './Icon'

const TIME_FORMAT = /^\d{1,2}(\.\d{1,2})?$/
const TICK_MS = 47

function formatTime(time) {
  if (time === null || time === undefined) return ''
  return String(time)
}

export default function ParticipantRow({ participant }) {
  const { saveTime, setAbsent, setVisitor, getConflict, resolveConflict } = useCompetition()
  const [draft, setDraft] = useState(formatTime(participant.result.time))
  const [saveState, setSaveState] = useState('idle') 
  const [error, setError] = useState('')
  const [confirmUnusual, setConfirmUnusual] = useState(null)

  const [stopwatchOpen, setStopwatchOpen] = useState(false)
  const [stopwatchPhase, setStopwatchPhase] = useState('idle') 
  const [stopwatchElapsed, setStopwatchElapsed] = useState(0)
  const stopwatchStartRef = useRef(null)
  const stopwatchIntervalRef = useRef(null)


  const baselineRef = useRef({ time: participant.result.time, updatedAt: participant.result.updatedAt })
  const isEditingRef = useRef(false)

  const conflict = getConflict(participant.id)

  useEffect(() => {
    if (!isEditingRef.current) {
      setDraft(formatTime(participant.result.time))
      baselineRef.current = { time: participant.result.time, updatedAt: participant.result.updatedAt }
    }
  }, [participant.result.time, participant.result.updatedAt])

  useEffect(() => {
    return () => {
      if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current)
    }
  }, [])

  async function performSave(numeric) {
    setSaveState('saving')
    try {
      const result = await saveTime(participant.id, numeric, baselineRef.current)
      if (result.queued) {
        setSaveState('queued')
      } else if (result.ok) {
        setSaveState('saved')
        baselineRef.current = { time: result.time, updatedAt: result.updatedAt }
      } else {

        setSaveState('idle')
      }
      return result
    } catch {
      setSaveState('error')
      setError('No se pudo guardar. Probá de nuevo.')
      return null
    }
  }

  async function attemptSave(numeric) {
    if ((numeric < 8 || numeric > 60) && confirmUnusual !== numeric) {
      setConfirmUnusual(numeric)
      return { needsConfirmation: true }
    }
    setError('')
    setConfirmUnusual(null)
    await performSave(numeric)
    return { needsConfirmation: false }
  }

  async function commit(rawValue) {
    const value = rawValue.trim()
    if (value === '') return

    if (!TIME_FORMAT.test(value)) {
      setError('Tiempo inválido. Usá el formato segundos.centésimas, ej: 18.42')
      setSaveState('error')
      return
    }

    await attemptSave(Number(value))
  }

  async function handleResolve(choice) {
    await resolveConflict(participant.id, choice)
    isEditingRef.current = false
  }



  function openStopwatch() {
    isEditingRef.current = true
    baselineRef.current = { time: participant.result.time, updatedAt: participant.result.updatedAt }
    setStopwatchOpen(true)
    setStopwatchPhase('idle')
    setStopwatchElapsed(0)
  }

  function closeStopwatch() {
    if (stopwatchIntervalRef.current) clearInterval(stopwatchIntervalRef.current)
    isEditingRef.current = false
    setStopwatchOpen(false)
    setStopwatchPhase('idle')
    setStopwatchElapsed(0)
  }

  function startStopwatch() {
    stopwatchStartRef.current = Date.now()
    setStopwatchPhase('running')
    stopwatchIntervalRef.current = setInterval(() => {
      setStopwatchElapsed((Date.now() - stopwatchStartRef.current) / 1000)
    }, TICK_MS)
  }

  function stopStopwatch() {

    const finalElapsed = (Date.now() - stopwatchStartRef.current) / 1000
    clearInterval(stopwatchIntervalRef.current)
    setStopwatchElapsed(finalElapsed)
    setStopwatchPhase('stopped')
  }

  function discardStopwatch() {
    setStopwatchPhase('idle')
    setStopwatchElapsed(0)
  }

  async function confirmStopwatch() {
    const numeric = Math.round(stopwatchElapsed * 100) / 100
    const result = await attemptSave(numeric)
    if (!result.needsConfirmation) {
      closeStopwatch()
    }
  }

  const isAbsent = !participant.participa
  const isPending = participant.result.pending || participant.pendingSync

  const inputClass = [
    'time-field__input',
    saveState === 'saved' && !isAbsent ? 'is-saved' : '',
    saveState === 'saving' ? 'is-saving' : '',
    saveState === 'error' ? 'is-error' : '',
    saveState === 'queued' || (isPending && saveState === 'idle') ? 'is-queued' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`participant-row ${isAbsent ? 'participant-row--absent' : ''}`}>
      <button
        type="button"
        className="participant-row__name participant-row__name-btn"
        onClick={() => (stopwatchOpen ? closeStopwatch() : !isAbsent && openStopwatch())}
        disabled={isAbsent}
      >
        {!isAbsent && <Icon name="stopwatch" className="stopwatch-affordance" />}
        {participant.name}
        {participant.esColegioVisitante && <span className="visitor-tag">Visitante</span>}
      </button>

      {stopwatchOpen && !isAbsent && (
        <div className="stopwatch-panel">
          <div className={`stopwatch-display ${stopwatchPhase === 'running' ? 'is-running' : ''}`}>
            {stopwatchElapsed.toFixed(2)}
          </div>
          {stopwatchPhase === 'idle' && (
            <div className="stopwatch-actions">
              <button className="btn btn--accent" onClick={startStopwatch}>
                <Icon name="play" /> Iniciar
              </button>
              <button className="btn btn--ghost" onClick={closeStopwatch}>
                Usar teclado
              </button>
            </div>
          )}
          {stopwatchPhase === 'running' && (
            <div className="stopwatch-actions">
              <button className="btn btn--accent" onClick={stopStopwatch}>
                <Icon name="stop" /> Parar
              </button>
            </div>
          )}
          {stopwatchPhase === 'stopped' && (
            <div className="stopwatch-actions">
              <button className="btn btn--ghost" onClick={discardStopwatch}>
                Descartar
              </button>
              <button className="btn btn--accent" onClick={confirmStopwatch} disabled={saveState === 'saving'}>
                {saveState === 'saving' ? (
                  'Guardando…'
                ) : (
                  <>
                    <Icon name="check" /> Confirmar {stopwatchElapsed.toFixed(2)}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="participant-row__controls">
        {!isAbsent && !stopwatchOpen && (
          <div className="time-field">
            <input
              className={inputClass}
              type="text"
              inputMode="decimal"
              placeholder="00.00"
              aria-label={`Tiempo de ${participant.name}`}
              value={draft}
              onFocus={() => {
                isEditingRef.current = true
                baselineRef.current = { time: participant.result.time, updatedAt: participant.result.updatedAt }
              }}
              onChange={(e) => {
                setDraft(e.target.value)
                setSaveState('idle')
                setError('')
              }}
              onBlur={(e) => {
                isEditingRef.current = false
                commit(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
            />
          </div>
        )}

        <label className="checkbox-pill">
          <input
            type="checkbox"
            checked={isAbsent}
            onChange={(e) => setAbsent(participant.id, e.target.checked)}
          />
          No participa
        </label>

        <label className="checkbox-pill">
          <input
            type="checkbox"
            checked={participant.esColegioVisitante}
            onChange={(e) => setVisitor(participant.id, e.target.checked)}
          />
          Visitante
        </label>
      </div>

      {error && <div className="hint-text" style={{ color: 'var(--danger)' }}>{error}</div>}
      {saveState === 'saved' && !error && (
        <div className="hint-text" style={{ color: 'var(--success)' }}><Icon name="check" /> Guardado</div>
      )}
      {saveState === 'queued' && (
        <div className="hint-text" style={{ color: 'var(--warning)' }}>
          <Icon name="hourglass-half" /> Sin conexión — se guarda solo cuando vuelva la señal
        </div>
      )}
      {isPending && saveState === 'idle' && !error && (
        <div className="hint-text" style={{ color: 'var(--warning)' }}><Icon name="hourglass-half" /> Pendiente de sincronizar</div>
      )}

      {confirmUnusual !== null && (
        <div className="hint-text" style={{ color: 'var(--warning)' }}>
          <Icon name="triangle-exclamation" /> {confirmUnusual} parece un tiempo inusual para 25 m crol.{' '}
          <button
            className="btn btn--ghost"
            style={{ minHeight: 36, padding: '0 12px', display: 'inline-flex', width: 'auto', marginTop: 6 }}
            onClick={() => performSave(confirmUnusual).then(() => { setConfirmUnusual(null); closeStopwatch() })}
          >
            Confirmar y guardar {confirmUnusual}
          </button>
        </div>
      )}

      {conflict && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 10,
            background: 'var(--warning-tint)',
            border: '1.5px solid var(--warning)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)', marginBottom: 4 }}>
            <Icon name="triangle-exclamation" /> Otro profesor ya cargó un tiempo distinto acá
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10 }}>
            Tu valor: <strong>{conflict.attempted}</strong> · Valor guardado ahora:{' '}
            <strong>{conflict.current === null ? '— (sin tiempo)' : conflict.current}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn--ghost"
              style={{ minHeight: 40 }}
              onClick={() => handleResolve('theirs')}
            >
              Dejar {conflict.current === null ? 'sin tiempo' : conflict.current}
            </button>
            <button
              className="btn btn--accent"
              style={{ minHeight: 40 }}
              onClick={() => handleResolve('mine')}
            >
              Usar mi valor ({conflict.attempted})
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
