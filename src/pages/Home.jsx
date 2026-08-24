import { useNavigate } from 'react-router-dom'
import { useCompetition } from '../context/CompetitionContext'
import LiveBadge from '../components/LiveBadge'
import BottomNav from '../components/BottomNav'
import Icon from '../components/Icon'

export default function Home() {
  const { competition, years, status, error, reload } = useCompetition()
  const navigate = useNavigate()

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

        <div className="section-label">Seleccioná el año</div>
        <div className="year-grid">
          {years.map((year) => (
            <button
              key={year}
              className="year-tile"
              onClick={() => navigate(`/anio/${year}`)}
            >
              <div className="year-tile__number">{year}°</div>
              <div className="year-tile__label">Año</div>
            </button>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
