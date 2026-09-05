import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCompetition } from '../../context/CompetitionContext'
import TopBar from '../../components/TopBar'
import Icon from '../../components/Icon'

const BLOQUE_TITLE = {
  unico: 'Mañana — 3° a 6°',
  '3_4': 'Tarde — 3° y 4°',
  '5_6': 'Tarde — 5° y 6°',
}


const YEARS_FOR_BLOQUE = {
  unico: [3, 4, 5, 6],
  '3_4': [3, 4],
  '5_6': [5, 6],
}

export default function AdminYear() {
  const { turno, bloque } = useParams()
  const { getSeriesListForBloque, getParticipantsForSeriesId, addSeries, deleteSeries, mergeSeries } =
    useCompetition()

  const seriesList = getSeriesListForBloque(turno, bloque)
  const nextSeriesNumber =
    seriesList.length === 0 ? 1 : Math.max(...seriesList.map((s) => s.seriesNumber)) + 1
  const [addingSeries, setAddingSeries] = useState(false)
  const years = YEARS_FOR_BLOQUE[bloque] || []

  async function handleAddSeries() {
    setAddingSeries(true)
    try {
      await addSeries(turno, bloque, nextSeriesNumber)
    } finally {
      setAddingSeries(false)
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        icon="gear"
        title={BLOQUE_TITLE[bloque] || bloque}
        subtitle="Administrar series y alumnos"
        backTo="/admin"
      />
      <main>
        {seriesList.length === 0 && (
          <div className="empty-state">Todavía no hay series para este bloque.</div>
        )}

        {seriesList.map((series) => (
          <SeriesEditor
            key={series.id}
            series={series}
            participants={getParticipantsForSeriesId(series.id)}
            turno={turno}
            years={years}
            allSeries={seriesList}
            onDeleteSeries={() => deleteSeries(series.id)}
            onMerge={mergeSeries}
          />
        ))}

        <div style={{ height: 4 }} />
        <button className="btn btn--ghost" onClick={handleAddSeries} disabled={addingSeries}>
          {addingSeries ? 'Agregando…' : `+ Agregar serie ${nextSeriesNumber}`}
        </button>
      </main>
    </div>
  )
}

function SeriesEditor({ series, participants, turno, years, allSeries, onDeleteSeries, onMerge }) {
  const { createParticipant, updateParticipant, deleteParticipant } = useCompetition()
  const [newName, setNewName] = useState('')
  const [newYear, setNewYear] = useState(years[0])
  const [newVisitor, setNewVisitor] = useState(false)
  const [adding, setAdding] = useState(false)
  const [mergeTarget, setMergeTarget] = useState('')
  const [confirmingMerge, setConfirmingMerge] = useState(false)
  const [merging, setMerging] = useState(false)

  const otherSeries = (allSeries || []).filter((s) => s.id !== series.id)
  const targetSeries = otherSeries.find((s) => s.id === mergeTarget)

  async function handleMerge() {
    if (!mergeTarget) return
    setMerging(true)
    try {
      await onMerge(series.id, mergeTarget)
      setMergeTarget('')
      setConfirmingMerge(false)
    } finally {
      setMerging(false)
    }
  }

  async function handleAddParticipant(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      await createParticipant({
        year: newYear,
        turno,
        seriesNumber: series.seriesNumber,
        name,
        esColegioVisitante: newVisitor,
      })
      setNewName('')
      setNewVisitor(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="tile" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="tile__label">
          Serie {series.seriesNumber}
          {series.color && (
            <span className={`color-badge color-badge--${series.color.replace('_', '-')}`} style={{ marginLeft: 8 }}>
              {series.color}
            </span>
          )}
        </div>
        {participants.length === 0 && (
          <button
            onClick={onDeleteSeries}
            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 13, fontWeight: 700 }}
          >
            Eliminar serie
          </button>
        )}
      </div>

      {participants.map((p) => (
        <ParticipantEditor
          key={p.id}
          participant={p}
          years={years}
          onUpdate={(patch) => updateParticipant(p.id, patch)}
          onDelete={() => deleteParticipant(p.id)}
        />
      ))}

      <form
        onSubmit={handleAddParticipant}
        style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid var(--line)' }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nombre del alumno"
          style={{ flex: 1, minWidth: 140, padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14 }}
        />
        {years.length > 1 && (
          <select
            value={newYear}
            onChange={(e) => setNewYear(Number(e.target.value))}
            style={{ padding: '10px 8px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14 }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}°
              </option>
            ))}
          </select>
        )}
        <label className="checkbox-pill">
          <input type="checkbox" checked={newVisitor} onChange={(e) => setNewVisitor(e.target.checked)} />
          Visitante
        </label>
        <button className="btn btn--primary" type="submit" style={{ width: 'auto', padding: '0 16px', minHeight: 40 }} disabled={adding}>
          {adding ? 'Agregando…' : '+ Agregar'}
        </button>
      </form>

      {otherSeries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6, borderTop: '1px solid var(--line)' }}>
          <div className="section-label" style={{ margin: 0 }}>Fusionar esta serie con otra</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={mergeTarget}
              onChange={(e) => {
                setMergeTarget(e.target.value)
                setConfirmingMerge(false)
              }}
              style={{ flex: 1, minWidth: 180, padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14 }}
            >
              <option value="">Elegir serie destino…</option>
              {otherSeries.map((s) => (
                <option key={s.id} value={s.id}>
                  Serie {s.seriesNumber}
                  {s.color ? ` · ${s.color}` : ''} — {s.participantCount} participante
                  {s.participantCount !== 1 ? 's' : ''}
                </option>
              ))}
            </select>

            {!confirmingMerge ? (
              <button
                className="btn btn--ghost"
                type="button"
                disabled={!mergeTarget}
                onClick={() => setConfirmingMerge(true)}
                style={{ width: 'auto', padding: '0 14px', minHeight: 40 }}
              >
                Fusionar
              </button>
            ) : (
              <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  Mueve {participants.length} participante{participants.length !== 1 ? 's' : ''} a Serie{' '}
                  {targetSeries?.seriesNumber} y borra esta serie. ¿Confirmar?
                </span>
                <button
                  className="btn btn--danger"
                  type="button"
                  disabled={merging}
                  onClick={handleMerge}
                  style={{ width: 'auto', padding: '0 12px', minHeight: 36 }}
                >
                  {merging ? '...' : 'Sí'}
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => setConfirmingMerge(false)}
                  style={{ width: 'auto', padding: '0 12px', minHeight: 36 }}
                >
                  No
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ParticipantEditor({ participant, years, onUpdate, onDelete }) {
  const [name, setName] = useState(participant.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  function commitName() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== participant.name) onUpdate({ name: trimmed })
    else setName(participant.name)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '6px 0' }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        style={{ flex: 1, minWidth: 120, padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 14 }}
      />
      {years.length > 1 && (
        <select
          value={participant.year ?? years[0]}
          onChange={(e) => onUpdate({ year: Number(e.target.value) })}
          style={{ padding: '8px 6px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 13 }}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}°
            </option>
          ))}
        </select>
      )}
      <label className="checkbox-pill">
        <input
          type="checkbox"
          checked={participant.esColegioVisitante}
          onChange={(e) => onUpdate({ esColegioVisitante: e.target.checked })}
        />
        Visitante
      </label>
      {!confirmingDelete ? (
        <button
          onClick={() => setConfirmingDelete(true)}
          aria-label={`Eliminar a ${participant.name}`}
          style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: 13, padding: 6 }}
        >
          <Icon name="trash" />
        </button>
      ) : (
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>¿Eliminar?</span>
          <button
            onClick={onDelete}
            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 12, fontWeight: 700, padding: '4px 6px' }}
          >
            Sí
          </button>
          <button
            onClick={() => setConfirmingDelete(false)}
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-soft)', fontSize: 12, padding: '4px 6px' }}
          >
            No
          </button>
        </span>
      )}
    </div>
  )
}
