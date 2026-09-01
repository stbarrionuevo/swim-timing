import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCompetition } from '../../context/CompetitionContext'
import TopBar from '../../components/TopBar'
import BottomNav from '../../components/BottomNav'
import Icon from '../../components/Icon'

export default function AdminHome() {
  const { competition, years, getSeriesListForYear, updateCompetition } = useCompetition()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: competition?.name || '',
    event: competition?.event || '',
    date: competition?.date || '',
  })
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setForm({ name: competition.name, event: competition.event, date: competition.date })
    setEditing(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateCompetition(form)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-shell">
      <TopBar icon="gear" title="Administración" subtitle={competition?.name} />
      <main className="has-bottom-nav">
        <div className="tile" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch' }}>
          {!editing ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="tile__label">{competition?.name}</div>
                  <div className="tile__meta">
                    {competition?.event} ·{' '}
                    {competition?.date &&
                      new Date(`${competition.date}T00:00:00`).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                  </div>
                </div>
                <button
                  onClick={startEdit}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: 13, fontWeight: 700 }}
                >
                  Editar
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="section-label" style={{ margin: 0 }}>
                Nombre
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 15 }}
                />
              </label>
              <label className="section-label" style={{ margin: 0 }}>
                Prueba
                <input
                  value={form.event}
                  onChange={(e) => setForm((f) => ({ ...f, event: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 15 }}
                />
              </label>
              <label className="section-label" style={{ margin: 0 }}>
                Fecha
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  style={{ display: 'block', width: '100%', marginTop: 4, padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--line)', fontSize: 15 }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn--ghost" onClick={() => setEditing(false)}>
                  Cancelar
                </button>
                <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="section-label">Alumnos por año</div>
        {years.map((year) => {
          const seriesList = getSeriesListForYear(year)
          const totalParticipants = seriesList.reduce((sum, s) => sum + s.participantCount, 0)
          return (
            <button key={year} className="tile" onClick={() => navigate(`/admin/anio/${year}`)}>
              <div>
                <div className="tile__label">{year}° año</div>
                <div className="tile__meta">
                  {totalParticipants} alumno{totalParticipants !== 1 ? 's' : ''} ·{' '}
                  {seriesList.length} serie{seriesList.length !== 1 ? 's' : ''}
                </div>
              </div>
              <span className="tile__chevron"><Icon name="chevron-right" /></span>
            </button>
          )
        })}

        <div style={{ height: 8 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
  <Link to="/admin/importar" className="btn btn--accent" style={{ textDecoration: 'none' }}>
    <Icon name="file-import" /> Importar alumnos (CSV / Excel)
  </Link>
  <Link to="/admin/umbrales" className="btn btn--accent" style={{ textDecoration: 'none' }}>
    <Icon name="palette" /> Definir colores
  </Link>
  <Link to="/admin/finales" className="btn btn--accent" style={{ textDecoration: 'none' }}>
    <Icon name="flag-checkered" /> Ir a finales
  </Link>
</div>
        
      </main>
      <BottomNav />
    </div>
  )
}
