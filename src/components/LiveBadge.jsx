import { useCompetition } from '../context/CompetitionContext'

const CONFIG = {
  connected: { label: 'En vivo', color: '#3ddc84' },
  connecting: { label: 'Conectando…', color: '#e0a100' },
  error: { label: 'Sin conexión en vivo', color: '#ff6b6b' },
  offline: { label: 'Sin conexión', color: '#ff6b6b' },
}

export default function LiveBadge({ variant = 'onDark' }) {
  const { liveStatus, isOnline, pendingCount } = useCompetition()
  const effectiveStatus = !isOnline ? 'offline' : liveStatus
  const cfg = CONFIG[effectiveStatus] || CONFIG.connecting
  const textColor = variant === 'onDark' ? 'rgba(255,255,255,0.85)' : 'var(--ink-soft)'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 700,
        color: textColor,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.color,
          boxShadow: effectiveStatus === 'connected' ? `0 0 6px ${cfg.color}` : 'none',
        }}
      />
      {cfg.label}
      {pendingCount > 0 && (
        <span
          style={{
            background: 'rgba(224,161,0,0.25)',
            color: variant === 'onDark' ? '#ffd88a' : 'var(--warning)',
            borderRadius: 999,
            padding: '1px 7px',
            fontSize: 10,
          }}
        >
          {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
        </span>
      )}
    </span>
  )
}
