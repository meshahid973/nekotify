import {
  ChevronLeft,
  ChevronRight,
  Home,
  Library,
  Music2,
  Search,
  Settings,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { IconButton } from '@/components/primitives/IconButton'
import { useUiStore } from '@/stores/ui.store'

import './Sidebar.css'

const discoverLinks = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search, end: false },
]

const libraryLinks = [
  { to: '/library', label: 'Library', icon: Library, end: false },
]

export function Sidebar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)

  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark" aria-hidden="true">
          <Music2 size={18} strokeWidth={2.2} />
        </span>
        <span className="sidebar__brand-name">Nekotify</span>
      </div>

      <nav className="sidebar__nav">
        <SidebarGroup
          label="Discover"
          links={discoverLinks}
          collapsed={collapsed}
        />
        <SidebarGroup
          label="Library"
          links={libraryLinks}
          collapsed={collapsed}
        />
      </nav>

      <div className="sidebar__footer">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
          }
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={18} aria-hidden="true" />
          <span className="sidebar-link__label">Settings</span>
        </NavLink>

        <IconButton
          className="sidebar__collapse"
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={toggleSidebar}
        >
          {collapsed ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronLeft size={18} />
          )}
        </IconButton>
      </div>
    </aside>
  )
}

interface SidebarGroupProps {
  label: string
  collapsed: boolean
  links: Array<{
    to: string
    label: string
    icon: typeof Home
    end: boolean
  }>
}

function SidebarGroup({ label, collapsed, links }: SidebarGroupProps) {
  return (
    <section className="sidebar-group" aria-label={label}>
      <p className="sidebar-group__label">{label}</p>
      <div className="sidebar-group__links">
        {links.map(({ to, label: linkLabel, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
            }
            title={collapsed ? linkLabel : undefined}
          >
            <Icon size={18} aria-hidden="true" />
            <span className="sidebar-link__label">{linkLabel}</span>
          </NavLink>
        ))}
      </div>
    </section>
  )
}
