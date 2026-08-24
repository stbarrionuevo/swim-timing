import { useState } from 'react'
import { useCompetition } from '../context/CompetitionContext'
import TopBar from '../components/TopBar'
import RankRow from '../components/RankRow'
import BottomNav from '../components/BottomNav'

export default function Results() {
  const { competition, years, getRankingForYear, getRankingGeneral } = useCompetition()
  const [tab, setTab] = useState('anio') // 'anio' | 'general'
  const [selectedYear, setSelectedYear] = useState(years[0])

  const rankingAnio = getRankingForYear(selectedYear)
  const rankingGeneral = getRankingGeneral()

  return (
    <div className="app-shell">
      <TopBar icon="trophy" title="Resultados" subtitle={competition?.event} />
      <main className="has-bottom-nav">
        <div className="tabs">
          <button
            className={`tabs__btn ${tab === 'anio' ? 'is-active' : ''}`}
            onClick={() => setTab('anio')}
          >
            Por año
          </button>
          <button
            className={`tabs__btn ${tab === 'general' ? 'is-active' : ''}`}
            onClick={() => setTab('general')}
          >
            General
          </button>
        </div>

        {tab === 'anio' && (
          <>
            <div className="tabs" style={{ flexWrap: 'wrap' }}>
              {years.map((y) => (
                <button
                  key={y}
                  className={`tabs__btn ${selectedYear === y ? 'is-active' : ''}`}
                  style={{ flex: '0 0 auto', minWidth: 52, padding: '0 12px' }}
                  onClick={() => setSelectedYear(y)}
                >
                  {y}°
                </button>
              ))}
            </div>

            {rankingAnio.length === 0 ? (
              <div className="empty-state">Todavía no hay tiempos cargados para {selectedYear}° año.</div>
            ) : (
              rankingAnio.map((p, i) => (
                <RankRow key={p.id} position={i + 1} participant={p} />
              ))
            )}
          </>
        )}

        {tab === 'general' && (
          <>
            {rankingGeneral.length === 0 ? (
              <div className="empty-state">Todavía no hay tiempos cargados.</div>
            ) : (
              rankingGeneral.map((p, i) => (
                <RankRow key={p.id} position={i + 1} participant={p} showYear />
              ))
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
