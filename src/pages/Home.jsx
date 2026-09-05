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


const BLOQUES_POR_TURNO = {
  mañana: [{ key: 'unico', label: 'Ver series — 3° a 6°', meta: 'Bloque único · 3° a 6°', hero: true }],
  tarde: [
    { key: '3_4', label: '3° Y 4°', meta: 'Primer bloque de tarde' },
    { key: '5_6', label: '5° Y 6°', meta: 'Segundo bloque de tarde' },
  ],
}

export default function Home() {
  const { competition, status, error, reload } = useCompetition()
  const navigate = useNavigate()
  const [turno, setTurno] = useState('mañana')

  if (status === 'loading') {
    return (
      <div className="app-shell home-screen">
        <main>
          <div className="empty-state">Cargando competencia…</div>
        </main>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="app-shell home-screen">
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

  const bloques = BLOQUES_POR_TURNO[turno]

  return (
    <div className="app-shell home-screen">
      <main className="has-bottom-nav">
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
          <LiveBadge variant="onDark" />
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
              type="button"
              className={`tabs__btn ${turno === t.key ? 'is-active' : ''}`}
              aria-pressed={turno === t.key}
              onClick={() => setTurno(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="home-blocks__intro">
          {turno === 'mañana' ? (
            <div className="home-blocks__hero-copy"></div>
          ) : (
            <div className="home-blocks__prompt">Seleccioná dónde cargar tiempos</div>
          )}
        </div>
        <div className={turno === 'tarde' ? 'home-blocks home-blocks--tarde' : 'home-blocks'}>
          {bloques.map((bloque) => {
            const tileClass = bloque.hero
              ? 'home-block-tile home-block-tile--hero'
              : 'home-block-tile'

            return (
              <button
                key={bloque.key}
                type="button"
                className={tileClass}
                aria-label={bloque.hero ? 'Ver series — 3° a 6°' : bloque.label}
                onClick={() => navigate(`/turno/${turno}/bloque/${bloque.key}`)}
              >
                <span className="home-block-tile__icon" aria-hidden="true">
                  <span className="home-block-tile__icon-structure">
                    <span className="home-block-tile__icon-section" />
                    <span className="home-block-tile__icon-section" />
                    <span className="home-block-tile__icon-section" />
                  </span>
                </span>
                <span className="home-block-tile__label">{bloque.label}</span>
                <span className="home-block-tile__meta">{bloque.meta}</span>
              </button>
            )
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
