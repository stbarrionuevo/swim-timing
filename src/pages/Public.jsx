import { useState } from 'react'
import { useCompetition } from '../context/CompetitionContext'
import RankRow from '../components/RankRow'
import LiveBadge from '../components/LiveBadge'
import Icon from '../components/Icon'

export default function Public() {
  const { competition, getRankingGeneral } = useCompetition()
  const [showTop, setShowTop] = useState(15)
  const ranking = getRankingGeneral().slice(0, showTop)

  return (
    <div className="public-view">
      <div style={{ position: 'fixed', top: 16, left: 16 }}>
        <LiveBadge />
      </div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', opacity: 0.7 }}>
          <Icon name="person-swimming" /> {(competition?.event || '').toUpperCase()}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>
          Resultado general
        </div>
      </div>

      {ranking.length === 0 ? (
        <div style={{ textAlign: 'center', opacity: 0.6, marginTop: 60, fontSize: 18 }}>
          Esperando resultados…
        </div>
      ) : (
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {ranking.map((p, i) => (
            <RankRow key={p.id} position={i + 1} participant={p} showYear />
          ))}
        </div>
      )}

      <button
        onClick={() => setShowTop((n) => (n === 15 ? 100 : 15))}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          background: 'rgba(255,255,255,0.1)',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          padding: '10px 16px',
          fontSize: 13,
        }}
      >
        {showTop === 15 ? 'Ver todos' : 'Ver top 15'}
      </button>
    </div>
  )
}
