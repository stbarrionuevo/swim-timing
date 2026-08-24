import { useNavigate } from 'react-router-dom'
import LiveBadge from './LiveBadge'
import Icon from './Icon'

export default function TopBar({ title, subtitle, backTo, icon }) {
  const navigate = useNavigate()
  return (
    <div className="topbar">
      {backTo && (
        <button
          className="topbar__back"
          onClick={() => navigate(backTo)}
          aria-label="Volver"
        >
          <Icon name="arrow-left" />
        </button>
      )}
      <div style={{ flex: 1 }}>
        <div className="topbar__title">
          {icon && <Icon name={icon} style={{ marginRight: 8 }} />}
          {title}
        </div>
        {subtitle && <div className="topbar__subtitle">{subtitle}</div>}
      </div>
      <LiveBadge />
    </div>
  )
}
