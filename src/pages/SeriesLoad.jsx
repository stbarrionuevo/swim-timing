import { useParams, useNavigate } from 'react-router-dom'
import { useCompetition } from '../context/CompetitionContext'
import TopBar from '../components/TopBar'
import ParticipantRow from '../components/ParticipantRow'

const BLOQUE_LABEL = {
  unico: 'Mañana',
  '3_4': 'Tarde — 3° y 4°',
  '5_6': 'Tarde — 5° y 6°',
}

const HEAT_LABEL = {
  media_pileta: 'Media pileta',
  rojo: 'Rojo',
  amarillo: 'Amarillo',
  verde: 'Verde',
}

export default function SeriesLoad() {
  const { turno, bloque, serieId } = useParams()
  const navigate = useNavigate()
  const { getParticipantsForSeriesId, getSeriesListForBloque } = useCompetition()

  const participants = getParticipantsForSeriesId(serieId)
  const series = getSeriesListForBloque(turno, bloque).find((item) => item.id === serieId)
  const seriesColor = HEAT_LABEL[series?.color] ? series.color : null
  const seriesType = series?.tipo || 'normal'
  const seriesNumber = series?.seriesNumber ?? participants[0]?.series
  const loadedCount = participants.filter(
    (p) => p.participa && p.result.time !== null
  ).length
  const activeCount = participants.filter((p) => p.participa).length

  return (
    <div className="app-shell series-load-screen">
      <TopBar
        title={
          <>
            <span className="series-load__header-copy">
              {seriesNumber ? `Serie ${seriesNumber} — ${BLOQUE_LABEL[bloque] || bloque}` : BLOQUE_LABEL[bloque] || bloque}
            </span>
            {seriesColor && (
              <span className={`series-load__heat-badge series-load__heat-badge--${seriesColor}`}>
                <span className="series-load__heat-dot" aria-hidden="true" />
                {HEAT_LABEL[seriesColor]}
              </span>
            )}
            {seriesType !== 'normal' && (
              <span className="series-load__type-badge">
                {seriesType === 'final' ? 'Final' : 'Preliminar'}
              </span>
            )}
          </>
        }
        subtitle={`${loadedCount}/${activeCount} tiempos cargados`}
        backTo={`/turno/${turno}/bloque/${bloque}`}
      />
      <main>
        {participants.length === 0 ? (
          <div className="empty-state">
            Esta serie todavía no tiene participantes asignados.
          </div>
        ) : (
          participants.map((p) => {
            const participantMeta = !p.participa
              ? 'no participa'
              : [p.year != null ? `${p.year}° año` : '', p.esColegioVisitante ? 'visitante' : '']
                  .filter(Boolean)
                  .join(' · ')

            return (
              <div
                key={p.id}
                className={`series-load__participant ${
                  seriesColor ? `series-card--${seriesColor}` : 'series-card--none'
                } ${!p.participa ? 'series-load__participant--absent' : ''}`}
                style={{ '--participant-meta': participantMeta ? `"· ${participantMeta}"` : '""' }}
              >
                <ParticipantRow participant={p} />
              </div>
            )
          })
        )}

        <div style={{ height: 8 }} />
        <button className="btn btn--primary" onClick={() => navigate(`/turno/${turno}/bloque/${bloque}`)}>
          Volver a series
        </button>
      </main>
    </div>
  )
}
