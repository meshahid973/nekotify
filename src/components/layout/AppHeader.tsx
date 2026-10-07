import { Home, Library, Music2, Search, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import './AppHeader.css'

const navigation = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/library', label: 'Library', icon: Library, end: false },
]

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__surface">
        <NavLink className="app-header__brand" to="/" aria-label="Nekotify home">
          <span className="app-header__mark" aria-hidden="true">
            <Music2 size={16} strokeWidth={2.35} />
          </span>
          <strong>Nekotify</strong>
        </NavLink>

        <nav className="app-header__nav" aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                isActive
                  ? 'app-header__nav-item app-header__nav-item--active'
                  : 'app-header__nav-item'
              }
            >
              <Icon size={14} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-header__actions">
          <NavLink
            to="/search"
            className={({ isActive }) =>
              isActive
                ? 'app-header__search app-header__search--active'
                : 'app-header__search'
            }
            aria-label="Search your music"
          >
            <Search size={14} aria-hidden="true" />
            <span>Search your music...</span>
            <kbd>Ctrl K</kbd>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              isActive
                ? 'app-header__icon-link app-header__icon-link--active'
                : 'app-header__icon-link'
            }
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={16} aria-hidden="true" />
          </NavLink>
        </div>
      </div>
    </header>
  )
}
