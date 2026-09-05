import { useState } from 'react'
import { useCompetition } from '../context/CompetitionContext'
import Icon from '../components/Icon'

const COLOR_LABELS = {
  media_pileta: 'Media pileta',
  rojo: 'Rojo',
  amarillo: 'Amarillo',
  verde: 'Verde',
}

const LEGEND_ITEMS = [
  { key: 'media_pileta', label: 'Media pileta' },
  { key: 'rojo', label: 'Rojo' },
  { key: 'amarillo', label: 'Amarillo' },
  { key: 'verde', label: 'Verde' },
]

function displayName(participant) {
  if (participant.esColegioVisitante) {
    return participant.name.replace(/\s*\(visitante\)\s*$/i, '')
  }
  return participant.name
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function formatTime(participant) {
  return Number(participant.result.time).toFixed(2)
}

function YearBadge({ participant, color, podium = false }) {
  const yearLabel = participant.year != null ? `${participant.year}° año` : 'Año sin dato'
  const colorLabel = color ? COLOR_LABELS[color] : 'Color pendiente'

  return (
    <span
      className={`public-year-badge ${podium ? 'public-year-badge--podium' : ''}`}
      aria-label={`${yearLabel}${participant.esColegioVisitante ? '. Participante invitado' : ''}. ${colorLabel}`}
    >
      <span className={`public-year-badge__dot public-year-badge__dot--${color || 'none'}`} aria-hidden="true" />
      <span>{yearLabel}</span>
      {participant.esColegioVisitante && (
        <span className="public-year-badge__visitor" aria-hidden="true">
          V
        </span>
      )}
    </span>
  )
}

function PodiumEntry({ participant, position, color, delay }) {
  if (!participant) {
    return (
      <div
        className={`public-podium__item public-podium__item--empty public-podium__item--${position}`}
        aria-hidden="true"
      />
    )
  }

  const name = displayName(participant)

  return (
    <article
      className={`public-podium__item public-podium__item--${position}`}
      style={{ '--podium-delay': delay }}
    >
      <div className={`public-podium__avatar public-podium__avatar--${position}`} aria-hidden="true">
        {initials(name)}
      </div>
      <div className="public-podium__name">{name}</div>
      <YearBadge participant={participant} color={color} podium />
      <div className={`public-podium__bar public-podium__bar--${position}`}>
        <span className="public-podium__position">{position}°</span>
        <span className="public-podium__time">{formatTime(participant)}</span>
      </div>
    </article>
  )
}

function ResultRow({ participant, position, color, index }) {
  return (
    <article className="public-result-row" style={{ '--row-index': index }}>
      <span className="public-result-row__position">{position}°</span>
      <div className="public-result-row__identity">
        <div className="public-result-row__name">{displayName(participant)}</div>
        <div className="public-result-row__meta">
          <YearBadge participant={participant} color={color} />
          {participant.esColegioVisitante && (
            <span className="public-result-row__visitor" role="img" aria-label="Participante invitado">
              V
            </span>
          )}
        </div>
      </div>
      <span className="public-result-row__time">{formatTime(participant)}</span>
    </article>
  )
}

export default function Public() {
  const { competition, getRankingGeneral, getSeriesListForBloque, turnos, bloquesPorTurno } = useCompetition()
  const [showAll, setShowAll] = useState(false)
  const ranking = getRankingGeneral().filter(
    (participant) => participant.participa !== false && participant.result?.time != null
  )

  // El color se lee de la serie ya sembrada (turno × bloque × color). No se
  // replica ningún corte de tiempo en esta pantalla.
  const colorBySeriesId = new Map()
  for (const turno of turnos || []) {
    for (const bloque of bloquesPorTurno?.[turno] || []) {
      for (const series of getSeriesListForBloque(turno, bloque) || []) {
        if (series.color) colorBySeriesId.set(series.id, series.color)
      }
    }
  }

  const colorFor = (participant) => colorBySeriesId.get(participant.seriesId) || null
  const currentTurno = competition?.turno || ranking.find((participant) => participant.turno)?.turno || 'mañana'
  const currentTurnoLabel = currentTurno === 'tarde' ? 'Tarde' : 'Mañana'
  const podium = ranking.slice(0, 3)
  const visibleRows = showAll ? ranking.slice(3) : ranking.slice(3, 15)
  const hasMoreRows = ranking.length > 15

  return (
    <div className="public-view">
      <header className="public-header">
        <div className="public-header__event">
          <Icon name="person-swimming" /> {competition?.event || 'Competencia de natación'}
        </div>
        <div className="public-live" role="status" aria-label="Resultados en vivo">
          <span className="public-live__dot" aria-hidden="true" /> EN VIVO
        </div>
        <h1 className="public-header__title">Turno {currentTurnoLabel}</h1>
        <p className="public-header__subtitle">Resultados generales — todos los años</p>
      </header>

      {ranking.length === 0 ? (
        <div className="public-empty">Esperando resultados…</div>
      ) : (
        <main className="public-content">
          <section className="public-podium" aria-label="Podio de resultados">
            <PodiumEntry participant={podium[1]} position={2} color={podium[1] ? colorFor(podium[1]) : null} delay="0s" />
            <PodiumEntry participant={podium[0]} position={1} color={podium[0] ? colorFor(podium[0]) : null} delay="0.1s" />
            <PodiumEntry participant={podium[2]} position={3} color={podium[2] ? colorFor(podium[2]) : null} delay="0.2s" />
          </section>

          <div className="public-legend" role="group" aria-label="Leyenda de colores de heat">
            {LEGEND_ITEMS.map((item) => (
              <span className="public-legend__item" key={item.key}>
                <span className={`public-legend__dot public-legend__dot--${item.key}`} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>

          {visibleRows.length > 0 && (
            <section className="public-results" aria-label="Resultados desde el cuarto puesto">
              {visibleRows.map((participant, index) => (
                <ResultRow
                  key={participant.id}
                  participant={participant}
                  position={index + 4}
                  color={colorFor(participant)}
                  index={index}
                />
              ))}
            </section>
          )}

          {hasMoreRows && (
            <button
              type="button"
              className={`public-results-toggle ${showAll ? 'is-complete' : ''}`}
              onClick={() => setShowAll((current) => !current)}
              aria-expanded={showAll}
            >
              {showAll ? <><Icon name="check" /> Mostrando todos</> : <>Ver los {ranking.length} resultados <Icon name="chevron-down" /></>}
            </button>
          )}
        </main>
      )}
    </div>
  )
}
