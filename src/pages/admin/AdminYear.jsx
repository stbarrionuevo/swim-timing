import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useCompetition } from '../../context/CompetitionContext'
import TopBar from '../../components/TopBar'
import Icon from '../../components/Icon'

export default function AdminYear() {
  const { turno, year } = useParams()
  const yearNum = Number(year)
  const { getSeriesListForYear, getParticipantsForSeries, addSeries, deleteSeries } = useCompetition()

  const seriesList = getSeriesListForYear(yearNum, turno)
  const nextSeriesNumber =
    seriesList.length === 0 ? 1 : Math.max(...seriesList.map((s) => s.seriesNumber)) + 1
  const [addingSeries, setAddingSeries] = useState(false)

  async function handleAddSeries() {
    setAddingSeries(true)
    try {
      await addSeries(yearNum, turno, nextSeriesNumber)
    } finally {
      setAddingSeries(false)
    }
  }

  return (
    <div className="app-shell">
      <TopBar
        icon="gear"
        title={`${yearNum}° año — ${turno === 'mañana' ? 'Mañana' : 'Tarde'}`}
        subtitle="Administrar series y alumnos"
        backTo="/admin"
      />
      <main>
        {seriesList.length === 0 && (
          <div className="empty-state">Todavía no hay series para este año.</div>
        )}

        {seriesList.map((series) => (
          <SeriesEditor
            key={series.id}
            series={series}
            participants={getParticipantsForSeries(yearNum, turno, series.seriesNumber)}
            year={yearNum}
            turno={turno}
            onDeleteSeries={() => deleteSeries(series.id)}
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

function SeriesEditor({ series, participants, year, turno, onDeleteSeries }) {
  const { createParticipant, updateParticipant, deleteParticipant } = useCompetition()
  const [newName, setNewName] = useState('')
  const [newVisitor, setNewVisitor] = useState(false)
  const [adding, setAdding] = useState(false)

  async function handleAddParticipant(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      await createParticipant({
        year,
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
        <div className="tile__label">Serie {series.seriesNumber}</div>
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
        <label className="checkbox-pill">
          <input type="checkbox" checked={newVisitor} onChange={(e) => setNewVisitor(e.target.checked)} />
          Visitante
        </label>
        <button className="btn btn--primary" type="submit" style={{ width: 'auto', padding: '0 16px', minHeight: 40 }} disabled={adding}>
          {adding ? 'Agregando…' : '+ Agregar'}
        </button>
      </form>
    </div>
  )
}

function ParticipantEditor({ participant, onUpdate, onDelete }) {
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