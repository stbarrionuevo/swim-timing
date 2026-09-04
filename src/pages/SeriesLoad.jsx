import { useParams, useNavigate } from 'react-router-dom'
import { useCompetition } from '../context/CompetitionContext'
import TopBar from '../components/TopBar'
import ParticipantRow from '../components/ParticipantRow'

const BLOQUE_LABEL = {
  unico: 'Mañana',
  '3_4': 'Tarde — 3° y 4°',
  '5_6': 'Tarde — 5° y 6°',
}

export default function SeriesLoad() {
  const { turno, bloque, serieId } = useParams()
  const navigate = useNavigate()
  const { getParticipantsForSeriesId } = useCompetition()

  const participants = getParticipantsForSeriesId(serieId)
  
  const seriesNumber = participants[0]?.series
  const loadedCount = participants.filter(
    (p) => p.participa && p.result.time !== null
  ).length
  const activeCount = participants.filter((p) => p.participa).length

  return (
    <div className="app-shell">
      <TopBar
        title={seriesNumber ? `Serie ${seriesNumber} — ${BLOQUE_LABEL[bloque] || bloque}` : BLOQUE_LABEL[bloque] || bloque}
        subtitle={`${loadedCount}/${activeCount} tiempos cargados`}
        backTo={`/turno/${turno}/bloque/${bloque}`}
      />
      <main>
        {participants.length === 0 ? (
          <div className="empty-state">
            Esta serie todavía no tiene participantes asignados.
          </div>
        ) : (
          participants.map((p) => <ParticipantRow key={p.id} participant={p} />)
        )}

        <div style={{ height: 8 }} />
        <button className="btn btn--primary" onClick={() => navigate(`/turno/${turno}/bloque/${bloque}`)}>
          Volver a series
        </button>
      </main>
    </div>
  )
}
