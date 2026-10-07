import {
  Folder,
  FolderPlus,
  Home,
  Library,
  Music2,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { useLibraryStore } from '@/features/library/library.store'

import './Sidebar.css'

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/library', label: 'Library', icon: Library, end: false },
  { to: '/search', label: 'Search', icon: Search, end: false },
]

export function Sidebar() {
  const folders = useLibraryStore((state) => state.folders)
  const tracks = useLibraryStore((state) => state.tracks)
  const status = useLibraryStore((state) => state.status)
  const importFolder = useLibraryStore((state) => state.importFolder)
  const refresh = useLibraryStore((state) => state.refresh)
  const busy = status === 'loading'

  return (
    <aside className="sidebar" aria-label="Library navigation">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark" aria-hidden="true">
          <Music2 size={18} />
        </span>
        <div>
          <strong>Nekotify</strong>
          <span>Local library</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive
                ? 'sidebar-link sidebar-link--active'
                : 'sidebar-link'
            }
          >
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
            {label === 'Library' && tracks.length > 0 ? (
              <small>{tracks.length}</small>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <section className="sidebar__section" aria-label="Music folders">
        <div className="sidebar__section-heading">
          <span>Folders</span>
          {folders.length > 0 ? <small>{folders.length}</small> : null}
        </div>

        <div className="sidebar__folders">
          {folders.slice(0, 4).map((folder) => (
            <div className="sidebar-folder" key={folder.path} title={folder.path}>
              <Folder size={14} aria-hidden="true" />
              <span>{folder.name}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="sidebar-action"
          disabled={busy}
          onClick={() => void importFolder()}
        >
          <FolderPlus size={16} aria-hidden="true" />
          <span>{busy ? 'Scanning…' : 'Add folder'}</span>
        </button>

        {folders.length > 0 ? (
          <button
            type="button"
            className="sidebar-action"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span>Rescan</span>
          </button>
        ) : null}
      </section>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          isActive
            ? 'sidebar-link sidebar__settings sidebar-link--active'
            : 'sidebar-link sidebar__settings'
        }
      >
        <Settings size={17} aria-hidden="true" />
        <span>Settings</span>
      </NavLink>
    </aside>
  )
}
