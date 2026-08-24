import { NavLink } from 'react-router-dom'
import Icon from './Icon'

const TABS = [
  { to: '/', label: 'Series', icon: 'person-swimming', end: true },
  { to: '/resultados', label: 'Resultados', icon: 'trophy', end: false },
  { to: '/publico', label: 'Público', icon: 'tv', end: false },
  { to: '/admin', label: 'Admin', icon: 'gear', end: true },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'is-active' : ''}`}
        >
          <Icon name={tab.icon} className="bottom-nav__icon" />
          <span className="bottom-nav__label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
