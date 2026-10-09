import {
  ChevronDown, Disc3, Folder, FolderPlus, Heart, Home, ImagePlus,
  Images, Library, ListMusic, Music2, RefreshCw, Search, Settings,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { NavLink, useLocation } from 'react-router-dom'

import { AnimatedIcon } from '@/components/primitives/AnimatedIcon'
import { useActiveIndicator } from '@/components/primitives/useActiveIndicator'
import { useCollectionsStore } from '@/features/collections/collections.store'
import { useLibraryStore } from '@/features/library/library.store'

import './Sidebar.css'

const mainLinks = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/search', label: 'Search', icon: Search, end: true },
  { to: '/library', label: 'Your library', icon: Library, end: false },
]

export function Sidebar() {
  const location = useLocation()
  const [expanded,setExpanded] = useState<Record<string,boolean>>({})
  const systemReduced = useReducedMotion()
  const activeKey = location.pathname === '/'
    ? 'home'
    : location.pathname === '/search'
      ? 'search'
      : location.pathname === '/library'
        ? new URLSearchParams(location.search).get('view') ?? 'library'
        : 'settings'
  const { containerRef, indicatorRef, indicatorStyle } = useActiveIndicator<HTMLElement>(activeKey)
  const view = location.pathname === '/library'
    ? new URLSearchParams(location.search).get('view')
    : null
  const folders = useLibraryStore((state) => state.folders)
  const tracks = useLibraryStore((state) => state.tracks)
  const artworkPool = useLibraryStore((state) => state.artworkPool)
  const busy = useLibraryStore((state) => state.status === 'loading')
  const importFolder = useLibraryStore((state) => state.importFolder)
  const importArtFolder = useLibraryStore((state) => state.importArtFolder)
  const importArtFile = useLibraryStore((state) => state.importArtFile)
  const refresh = useLibraryStore((state) => state.refresh)
  const favorites = useCollectionsStore((state) => state.favorites)
  const playlists = useCollectionsStore((state) => state.playlists)

  return (
    <aside className="sidebar" aria-label="Main navigation" ref={containerRef}>
      <NavLink to="/" className="sidebar__brand" aria-label="Nekotify Home">
        <span className="sidebar__brand-mark"><Music2 size={21} aria-hidden="true" /></span>
        <span className="sidebar__brand-copy"><strong>nekotify</strong></span>
      </NavLink>

      <motion.span className="sidebar__selection" ref={indicatorRef}
        style={indicatorStyle} aria-hidden="true"/>
      <div className="sidebar__scroll">
        <nav className="sidebar__nav" aria-label="Main pages">
          {mainLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              title={label}
              data-indicator-active={
                activeKey === (to === '/' ? 'home' : to === '/search' ? 'search' : 'library')
              }
              className={({ isActive }) =>
                isActive && (to !== '/library' || !view)
                  ? 'sidebar-link sidebar-link--active' : 'sidebar-link'
              }
            >
              <AnimatedIcon icon={Icon} size={19}
                variant={to === '/search' ? 'sway' : 'lift'} />
              <span>{label}</span>
              {to === '/library' && tracks.length > 0 ? <small>{tracks.length}</small> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__divider" />

        <div className="sidebar__section-title"><span>COLLECTION</span><Disc3 size={14} aria-hidden="true"/></div>
        <nav className="sidebar__nav" aria-label="Your collection">
          <NavLink to="/library?view=favorites" title="Favorites"
            data-indicator-active={activeKey === 'favorites'}
            className={view === 'favorites' ? 'sidebar-link sidebar-link--active' : 'sidebar-link'}>
            <AnimatedIcon icon={Heart} size={18} variant="pulse" /><span>Liked songs</span>
            {favorites.length > 0 ? <small>{favorites.length}</small> : null}
          </NavLink>
          <NavLink to="/library?view=playlists" title="Playlists"
            data-indicator-active={activeKey === 'playlists'}
            className={view === 'playlists' ? 'sidebar-link sidebar-link--active' : 'sidebar-link'}>
            <AnimatedIcon icon={ListMusic} size={18} variant="sway" /><span>Playlists</span>
            {playlists.length > 0 ? <small>{playlists.length}</small> : null}
          </NavLink>
        </nav>

        <div className="sidebar__section-title sidebar__section-title--second">
          <span>MUSIC FOLDERS</span><small>{folders.length || ''}</small>
        </div>
        <div className="sidebar__folders">
          {folders.map((folder) => (
            <div key={folder.path} className="sidebar-folder-node">
              <button type="button" className="sidebar-folder" title={folder.path}
                aria-expanded={Boolean(expanded[folder.path])}
                onClick={()=>setExpanded((old)=>({...old,[folder.path]:!old[folder.path]}))}>
                <Folder size={15} aria-hidden="true" />
                <span>{folder.name}</span>
                <motion.span animate={{rotate:expanded[folder.path]?180:0}}
                  transition={{duration:systemReduced?0:.18}}>
                  <ChevronDown size={13} aria-hidden="true"/>
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {expanded[folder.path] ? <motion.div className="sidebar-folder__path"
                  initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}}
                  exit={{height:0,opacity:0}} transition={{duration:systemReduced?0:.18}}>
                  <span title={folder.path}>{folder.path}</span>
                </motion.div>:null}
              </AnimatePresence>
            </div>
          ))}
        </div>

        <SidebarAction disabled={busy} label={busy ? 'Scanning…' : 'Add music folder'}
          icon={<FolderPlus size={18}/>} onClick={() => void importFolder()} />
        {folders.length > 0 ? (
          <SidebarAction disabled={busy} label="Rescan library"
            icon={<RefreshCw size={17}/>} onClick={() => void refresh()} />
        ) : null}

        <div className="sidebar__section-title sidebar__section-title--second">
          <span>ARTWORK</span><small>{artworkPool.length || ''}</small>
        </div>
        <SidebarAction disabled={busy} label="Import art folder"
          icon={<Images size={18}/>} onClick={() => void importArtFolder()} />
        <SidebarAction disabled={busy} label="Import cover image"
          icon={<ImagePlus size={18}/>} onClick={() => void importArtFile()} />
      </div>

      <div className="sidebar__footer">
        <NavLink to="/settings" title="Settings"
          data-indicator-active={activeKey === 'settings'}
          className={({ isActive }) => isActive
            ? 'sidebar-link sidebar-link--active'
            : 'sidebar-link'}>
          <AnimatedIcon icon={Settings} size={19} variant="tilt" /><span>Settings</span>
        </NavLink>
      </div>
    </aside>
  )
}

function SidebarAction({
  icon, label, disabled, onClick,
}: {
  icon: ReactNode; label: string; disabled?: boolean; onClick: () => void
}) {
  return (
    <button type="button" title={label} aria-label={label}
      className="sidebar-action" disabled={disabled} onClick={onClick}>
      {icon}<span>{label}</span>
    </button>
  )
}
