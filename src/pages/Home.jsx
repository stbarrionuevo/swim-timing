import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompetition } from '../context/CompetitionContext'
import LiveBadge from '../components/LiveBadge'
import BottomNav from '../components/BottomNav'
import Icon from '../components/Icon'

const TURNO_TABS = [
  { key: 'mañana', label: 'Mañana' },
  { key: 'tarde', label: 'Tarde' },
]

export default function Home() {
  const { competition, years, status, error, reload } = useCompetition()
  const navigate = useNavigate()
  const [turno, setTurno] = useState('mañana')

  if (status === 'loading') {
    return (
      <div className="app-shell">
        <main>
          <div className="empty-state">Cargando competencia…</div>
        </main>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="app-shell">
        <main>
          <div className="empty-state">
            No se pudo conectar con la base de datos.
            <div className="hint-text" style={{ color: 'var(--danger)', marginTop: 8 }}>
              {error}
            </div>
            <div style={{ height: 16 }} />
            <button className="btn btn--primary" onClick={reload}>
              Reintentar
            </button>
          </div>
        </main>
      </div>
    )
  }

  const bloques =
    turno === 'tarde'
      ? [
          { label: '3ro y 4to — primer turno tarde', years: years.filter((y) => y <= 4) },
          { label: '5to y 6to — segundo turno tarde', years: years.filter((y) => y > 4) },
        ]
      : [{ label: 'Seleccioná el año', years }]

  return (
    <div className="app-shell">
      <main className="has-bottom-nav">
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
          <LiveBadge variant="onLight" />
        </div>
        <div className="hero">
          <div className="hero__kicker"><Icon name="person-swimming" /> {competition.event}</div>
          <div className="hero__title">{competition.name}</div>
          <div className="hero__date">
            {new Date(`${competition.date}T00:00:00`).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </div>
        </div>

        <div className="tabs">
          {TURNO_TABS.map((t) => (
            <button
              key={t.key}
              className={`tabs__btn ${turno === t.key ? 'is-active' : ''}`}
              onClick={() => setTurno(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {bloques.map((bloque, i) => (
          <div key={i}>
            <div className="section-label">{bloque.label}</div>
            <div className="year-grid">
              {bloque.years.map((year) => (
                <button
                  key={year}
                  className="year-tile"
                  onClick={() => navigate(`/turno/${turno}/anio/${year}`)}
                >
                  <div className="year-tile__number">{year}°</div>
                  <div className="year-tile__label">Año</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  )
}