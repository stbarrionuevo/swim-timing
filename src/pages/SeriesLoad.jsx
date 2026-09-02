import { useParams, useNavigate } from 'react-router-dom'
import { useCompetition } from '../context/CompetitionContext'
import TopBar from '../components/TopBar'
import ParticipantRow from '../components/ParticipantRow'

export default function SeriesLoad() {
  const { turno,year, serie } = useParams()
  const yearNum = Number(year)
  const serieNum = Number(serie)
  const navigate = useNavigate()
  const { getParticipantsForSeries } = useCompetition()

  const participants = getParticipantsForSeries(yearNum, turno,serieNum)
  const loadedCount = participants.filter(
    (p) => p.participa && p.result.time !== null
  ).length
  const activeCount = participants.filter((p) => p.participa).length

  return (
    <div className="app-shell">
      <TopBar
      title={`${yearNum}° año — Serie ${serieNum} (${turno === 'mañana' ? 'Mañana' : 'Tarde'})`}
      subtitle={`${loadedCount}/${activeCount} tiempos cargados`}
      backTo={`/turno/${turno}/anio/${yearNum}`}
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
        <button className="btn btn--primary" onClick={() => navigate(`//turno/${turno}/anio/${yearNum}`)}>
          Volver a series
        </button>
      </main>
    </div>
  )
}
