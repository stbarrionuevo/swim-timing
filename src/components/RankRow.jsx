export default function RankRow({ position, participant, showYear = false }) {
  const podiumClass =
    position === 1
      ? 'rank-row--podium-1'
      : position === 2
      ? 'rank-row--podium-2'
      : position === 3
      ? 'rank-row--podium-3'
      : ''

  return (
    <div className={`rank-row ${podiumClass}`}>
      <div className="rank-row__pos">{position}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="rank-row__name">{participant.name}</div>
        {(showYear || participant.esColegioVisitante) && (
          <div className="rank-row__meta">
            {showYear ? `${participant.year}° año` : ''}
            {showYear && participant.esColegioVisitante ? ' · ' : ''}
            {participant.esColegioVisitante ? 'Visitante' : ''}
          </div>
        )}
      </div>
      <div className="rank-row__time">{participant.result.time.toFixed(2)}</div>
    </div>
  )
}
