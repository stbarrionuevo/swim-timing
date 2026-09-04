import { useState } from 'react'
import { useCompetition } from '../context/CompetitionContext'
import TopBar from '../components/TopBar'
import RankRow from '../components/RankRow'
import BottomNav from '../components/BottomNav'

const TURNO_TABS = [
  { key: 'mañana', label: 'Mañana' },
  { key: 'tarde', label: 'Tarde' },
]

const BLOQUE_TABS_TARDE = [
  { key: '3_4', label: '3° y 4°' },
  { key: '5_6', label: '5° y 6°' },
]

const YEARS_FOR_BLOQUE = {
  unico: [3, 4, 5, 6],
  '3_4': [3, 4],
  '5_6': [5, 6],
}

const COLOR_TABS = [
  { key: 'media_pileta', label: 'Media pileta' },
  { key: 'rojo', label: 'Rojo' },
  { key: 'amarillo', label: 'Amarillo' },
  { key: 'verde', label: 'Verde' },
]

export default function Results() {
  const { competition, getRankingGeneralBloque, getRankingFinalColor } = useCompetition()
  const [mainTab, setMainTab] = useState('preliminares') 
  const [turno, setTurno] = useState('mañana')
  const [bloqueTarde, setBloqueTarde] = useState('3_4')
  const [subTab, setSubTab] = useState('general') 
  const [color, setColor] = useState('verde') 

  const bloque = turno === 'mañana' ? 'unico' : bloqueTarde
  const years = YEARS_FOR_BLOQUE[bloque]
  const [selectedYear, setSelectedYear] = useState(years[0])

  const rankingGeneral = getRankingGeneralBloque(turno, bloque)
  const rankingCurso = rankingGeneral.filter((p) => p.year === (years.includes(selectedYear) ? selectedYear : years[0]))
  const rankingFinal = getRankingFinalColor(turno, bloque, color)

  function handleTurno(next) {
    setTurno(next)
    const nextBloque = next === 'mañana' ? 'unico' : bloqueTarde
    const nextYears = YEARS_FOR_BLOQUE[nextBloque]
    if (!nextYears.includes(selectedYear)) setSelectedYear(nextYears[0])
  }

  function handleBloqueTarde(next) {
    setBloqueTarde(next)
    const nextYears = YEARS_FOR_BLOQUE[next]
    if (!nextYears.includes(selectedYear)) setSelectedYear(nextYears[0])
  }

  return (
    <div className="app-shell">
      <TopBar icon="trophy" title="Resultados" subtitle={competition?.event} />
      <main className="has-bottom-nav">
        <div className="tabs">
          <button
            className={`tabs__btn ${mainTab === 'preliminares' ? 'is-active' : ''}`}
            onClick={() => setMainTab('preliminares')}
          >
            Preliminares
          </button>
          <button
            className={`tabs__btn ${mainTab === 'finales' ? 'is-active' : ''}`}
            onClick={() => setMainTab('finales')}
          >
            Finales
          </button>
        </div>

        <div className="tabs">
          {TURNO_TABS.map((t) => (
            <button
              key={t.key}
              className={`tabs__btn ${turno === t.key ? 'is-active' : ''}`}
              onClick={() => handleTurno(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Selector de bloque: solo aparece en tarde (mañana es un bloque
            único, se omite el paso . */}
        {turno === 'tarde' && (
          <div className="tabs">
            {BLOQUE_TABS_TARDE.map((b) => (
              <button
                key={b.key}
                className={`tabs__btn ${bloqueTarde === b.key ? 'is-active' : ''}`}
                onClick={() => handleBloqueTarde(b.key)}
              >
                {b.label}
              </button>
            ))}
          </div>
        )}

        {mainTab === 'preliminares' && (
          <>
            <div className="tabs">
              <button
                className={`tabs__btn ${subTab === 'general' ? 'is-active' : ''}`}
                onClick={() => setSubTab('general')}
              >
                General
              </button>
              <button
                className={`tabs__btn ${subTab === 'curso' ? 'is-active' : ''}`}
                onClick={() => setSubTab('curso')}
              >
                Por curso
              </button>
            </div>

            {subTab === 'curso' && (
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

                {rankingCurso.length === 0 ? (
                  <div className="empty-state">Todavía no hay tiempos cargados para {selectedYear}° año.</div>
                ) : (
                  rankingCurso.map((p, i) => <RankRow key={p.id} position={i + 1} participant={p} />)
                )}
              </>
            )}

            {subTab === 'general' && (
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
          </>
        )}

        {mainTab === 'finales' && (
          <>
            <div className="tabs" style={{ flexWrap: 'wrap' }}>
              {COLOR_TABS.map((c) => (
                <button
                  key={c.key}
                  className={`tabs__btn ${color === c.key ? 'is-active' : ''}`}
                  onClick={() => setColor(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {rankingFinal.length === 0 ? (
              <div className="empty-state">
                Todavía no hay final {color.replace('_', ' ')} generada o cronometrada para este bloque.
              </div>
            ) : (
              rankingFinal.map((p, i) => <RankRow key={p.id} position={i + 1} participant={p} showYear />)
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
