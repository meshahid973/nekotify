import {
  Folder,
  FolderPlus,
  Heart,
  ListMusic,
  Home,
  ImagePlus,
  Images,
  Library,
  Music2,
  RefreshCw,
  Search,
  Settings,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatedIcon } from '@/components/primitives/AnimatedIcon'

import { useLibraryStore } from '@/features/library/library.store'
import { useCollectionsStore } from '@/features/collections/collections.store'

import './Sidebar.css'

const links = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/library', label: 'Library', icon: Library, end: false },
  { to: '/search', label: 'Search', icon: Search, end: false },
]

export function Sidebar() {
  const location = useLocation()
  const collectionView = location.pathname === '/library' ? new URLSearchParams(location.search).get('view') : null
  const folders = useLibraryStore((state) => state.folders)
  const favorites = useCollectionsStore((state) => state.favorites)
  const playlists = useCollectionsStore((state) => state.playlists)
  const artSources = useLibraryStore((state) => state.artSources)
  const artworkPool = useLibraryStore((state) => state.artworkPool)
  const tracks = useLibraryStore((state) => state.tracks)
  const status = useLibraryStore((state) => state.status)
  const importFolder = useLibraryStore((state) => state.importFolder)
  const importArtFolder = useLibraryStore((state) => state.importArtFolder)
  const importArtFile = useLibraryStore((state) => state.importArtFile)
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
              isActive && (label !== 'Library' || !collectionView)
                ? 'sidebar-link sidebar-link--active'
                : 'sidebar-link'
            }
          >
            <AnimatedIcon icon={Icon} size={17} variant="lift" />
            <span>{label}</span>
            {label === 'Library' && tracks.length > 0 ? (
              <small>{tracks.length}</small>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <nav className="sidebar__nav sidebar__collections" aria-label="Collections">
        <NavLink to="/library?view=favorites" className={
          collectionView === 'favorites' ? 'sidebar-link sidebar-link--active' : 'sidebar-link'
        }>
          <Heart size={17}/><span>Favorites</span>
          {favorites.length ? <small>{favorites.length}</small> : null}
        </NavLink>
        <NavLink to="/library?view=playlists" className={
          collectionView === 'playlists' ? 'sidebar-link sidebar-link--active' : 'sidebar-link'
        }>
          <ListMusic size={17}/><span>Playlists</span>
          {playlists.length ? <small>{playlists.length}</small> : null}
        </NavLink>
      </nav>

      <SidebarSection title="Folders" count={folders.length}>
        <div className="sidebar__folders">
          {folders.slice(0, 4).map((folder) => (
            <div className="sidebar-folder" key={folder.path} title={folder.path}>
              <Folder size={14} aria-hidden="true" />
              <span>{folder.name}</span>
            </div>
          ))}
        </div>

        <SidebarAction
          disabled={busy}
          icon={<FolderPlus size={16} />}
          label={busy ? 'Scanning…' : 'Add music'}
          onClick={() => void importFolder()}
        />

        {folders.length > 0 ? (
          <SidebarAction
            disabled={busy}
            icon={<RefreshCw size={15} />}
            label="Rescan"
            onClick={() => void refresh()}
          />
        ) : null}
      </SidebarSection>

      <SidebarSection title="Artwork" count={artworkPool.length} compact>
        <SidebarAction
          disabled={busy}
          icon={<Images size={15} />}
          label="Add art folder"
          onClick={() => void importArtFolder()}
        />
        <SidebarAction
          disabled={busy}
          icon={<ImagePlus size={15} />}
          label="Add cover"
          onClick={() => void importArtFile()}
        />
        {artSources.length > 0 ? (
          <span className="sidebar__art-count">
            {artSources.length} {artSources.length === 1 ? 'source' : 'sources'}
          </span>
        ) : null}
      </SidebarSection>

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

function SidebarSection({
  title,
  count,
  compact = false,
  children,
}: {
  title: string
  count: number
  compact?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={
        compact
          ? 'sidebar__section sidebar__section--compact'
          : 'sidebar__section'
      }
    >
      <div className="sidebar__section-heading">
        <span>{title}</span>
        {count > 0 ? <small>{count}</small> : null}
      </div>
      {children}
    </section>
  )
}

function SidebarAction({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: ReactNode
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="sidebar-action"
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
