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


const BLOQUE_INFO = {
  unico: { label: 'Series de la mañana', meta: '3° a 6° juntos' },
  '3_4': { label: '3° y 4° — primer turno tarde', meta: 'Bloque 1' },
  '5_6': { label: '5° y 6° — segundo turno tarde', meta: 'Bloque 2' },
}

export default function Home() {
  const { competition, status, error, reload, bloquesPorTurno } = useCompetition()
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

  const bloques = bloquesPorTurno[turno]

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

        <div className="section-label">Seleccioná dónde cargar tiempos</div>
        {bloques.map((bloqueKey) => {
          const info = BLOQUE_INFO[bloqueKey]
          return (
            <button
              key={bloqueKey}
              className="tile"
              onClick={() => navigate(`/turno/${turno}/bloque/${bloqueKey}`)}
            >
              <div>
                <div className="tile__label">{info.label}</div>
                <div className="tile__meta">{info.meta}</div>
              </div>
              <span className="tile__chevron"><Icon name="chevron-right" /></span>
            </button>
          )
        })}
      </main>
      <BottomNav />
    </div>
  )
}
