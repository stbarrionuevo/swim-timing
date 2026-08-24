const LABELS = {
  pendiente: 'Pendiente',
  'en-progreso': 'En progreso',
  completada: 'Completada',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`status status--${status}`}>
      <span className="status__dot" />
      {LABELS[status] || status}
    </span>
  )
}
