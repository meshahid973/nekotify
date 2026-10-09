import {
  Disc3,
  Heart,
  ListMusic,
  FolderPlus,
  LayoutGrid,
  Mic2,
  Music,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { useSearchParams } from 'react-router-dom'
import type { ReactNode } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/primitives/Button'
import { PlaylistView } from '@/features/collections/PlaylistView'
import { useCollectionsStore } from '@/features/collections/collections.store'
import { PagedGroupList, PagedTrackList } from '@/features/library/PagedLibraryViews'
import { useLibraryStore } from '@/features/library/library.store'
import { useUiStore } from '@/stores/ui.store'
import type { Track } from '@/types/media'

import './LibraryPage.css'

type LibraryTab = 'songs' | 'albums' | 'artists' | 'favorites' | 'playlists'

interface TrackGroup {
  key: string
  title: string
  subtitle: string
  tracks: Track[]
}

export function LibraryPage() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view')
  const activeTab: LibraryTab =
    view === 'albums' || view === 'artists' || view === 'favorites' ||
    view === 'playlists' ? view : 'songs'
  const setActiveTab = (tab: LibraryTab) => setParams(tab === 'songs' ? {} : { view: tab })
  const [query, setQuery] = useState('')
  const tracks = useLibraryStore((state) => state.tracks)
  const favorites = useCollectionsStore((state) => state.favorites)
  const folders = useLibraryStore((state) => state.folders)
  const status = useLibraryStore((state) => state.status)
  const scanning = useLibraryStore((state) => state.scanning)
  const cancelScan = useLibraryStore((state) => state.cancelScan)
  const error = useLibraryStore((state) => state.error)
  const importFolder = useLibraryStore((state) => state.importFolder)
  const refresh = useLibraryStore((state) => state.refresh)
  const removeFolder = useLibraryStore((state) => state.removeFolder)
  const density = useUiStore((state) => state.density)
  const setDensity = useUiStore((state) => state.setDensity)

  const normalizedQuery = query.trim().toLowerCase()

  const filteredTracks = useMemo(
    () =>
      normalizedQuery
        ? tracks.filter((track) =>
            [track.title, track.artist, track.album]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(normalizedQuery)),
          )
        : tracks,
    [normalizedQuery, tracks],
  )

  const albums = useMemo(
    () => groupTracks(filteredTracks, 'album'),
    [filteredTracks],
  )
  const artists = useMemo(
    () => groupTracks(filteredTracks, 'artist'),
    [filteredTracks],
  )

  const busy = status === 'loading' || scanning
  const favoritePaths = new Set(favorites)
  const favoriteTracks = filteredTracks.filter(track=>favoritePaths.has(track.source.path))
  const refreshKey = status + ':' + String(scanning)

  return (
    <div className="page library-page">
      <PageHeader
        title="Your Library"
        actions={
          <div className="library-page__actions">
            <span>{tracks.length} songs</span>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void importFolder()}
            >
              <FolderPlus size={14} aria-hidden="true" />
              {busy ? 'Scanning…' : 'Add folder'}
            </Button>
          </div>
        }
      />

      {folders.length > 0 ? (
        <div className="library-folders" aria-label="Imported folders">
          {folders.map((folder) => (
            <div className="library-folder" key={folder.path} title={folder.path}>
              <span>{folder.name}</span>
              <button
                type="button"
                aria-label={'Remove ' + folder.name}
                onClick={() => void removeFolder(folder.path)}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="library-folders__rescan"
            onClick={() => { if(scanning) void cancelScan(); else void refresh() }}
          >
            {scanning ? <X size={13}/> : <RefreshCw size={13}/>}
            {scanning ? 'Cancel scan' : 'Rescan'}
          </button>
        </div>
      ) : null}

      <div className="library-toolbar">
        <label className="library-search">
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search songs, artists, albums"
            aria-label="Search library"
          />
        </label>

        <button
          type="button"
          className="library-density"
          onClick={() =>
            setDensity(density === 'compact' ? 'comfortable' : 'compact')
          }
        >
          <LayoutGrid size={14} aria-hidden="true" />
          {density === 'compact' ? 'Comfortable' : 'Compact'}
        </button>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(value)=>setActiveTab(value as LibraryTab)}
        className="library-tabs-root">
        <Tabs.List className="library-tabs" aria-label="Library views" activateOnFocus>
          <LibraryTabButton value="songs" icon={<Music size={14}/>} label="Songs"/>
          <LibraryTabButton value="albums" icon={<Disc3 size={14}/>} label="Albums"/>
          <LibraryTabButton value="artists" icon={<Mic2 size={14}/>} label="Artists"/>
          <LibraryTabButton value="favorites" icon={<Heart size={14}/>} label="Favorites"/>
          <LibraryTabButton value="playlists" icon={<ListMusic size={14}/>} label="Playlists"/>
          <Tabs.Indicator className="library-tabs__selection" />
        </Tabs.List>
      {error ? <p className="library-error">{error}</p> : null}

      <Tabs.Panel value="songs" className="library-tab-panel">
        {activeTab==='songs'&&(!folders.length&&!tracks.length?
          <LibraryEmpty busy={busy} hasFolders={false}
            onImport={()=>void importFolder()}/>:
          <PagedTrackList mode="songs" query={normalizedQuery}
            fallback={filteredTracks} refreshKey={refreshKey}
            emptyTitle="No matching songs. Try another search or import more music."/>)}
      </Tabs.Panel>
      <Tabs.Panel value="albums" className="library-tab-panel">
        {activeTab==='albums'&&<PagedGroupList mode="albums"
          query={normalizedQuery} fallback={albums}
          refreshKey={scanning?1:0}/>}
      </Tabs.Panel>
      <Tabs.Panel value="artists" className="library-tab-panel">
        {activeTab==='artists'&&<PagedGroupList mode="artists"
          query={normalizedQuery} fallback={artists}
          refreshKey={scanning?1:0}/>}
      </Tabs.Panel>
      <Tabs.Panel value="favorites" className="library-tab-panel">
        {activeTab==='favorites'&&<PagedTrackList mode="favorites"
          query={normalizedQuery} fallback={favoriteTracks}
          refreshKey={refreshKey+':'+favorites.join('|')}
          emptyTitle="No liked songs yet. Heart a track to see it here."/>}
      </Tabs.Panel>
      <Tabs.Panel value="playlists" className="library-tab-panel">
        {activeTab==='playlists'&&<PlaylistView/>}
      </Tabs.Panel>
      </Tabs.Root>
    </div>
  )
}

function LibraryTabButton({value,icon,label}:{
  value:LibraryTab;icon:ReactNode;label:string
}) {
  return <Tabs.Tab value={value} className="library-tab">
    {icon}{label}
  </Tabs.Tab>
}

function LibraryEmpty({
  busy,
  hasFolders,
  onImport,
}: {
  busy: boolean
  hasFolders: boolean
  onImport: () => void
}) {
  return (
    <div className="library-empty">
      <strong>
        {busy ? 'Scanning library…' : hasFolders ? 'No songs found' : 'No music yet'}
      </strong>
      {!hasFolders ? (
        <Button size="sm" disabled={busy} onClick={onImport}>
          <FolderPlus size={14} />
          Add folder
        </Button>
      ) : null}
    </div>
  )
}

function groupTracks(
  tracks: Track[],
  mode: 'album' | 'artist',
): TrackGroup[] {
  const groups = new Map<string, Track[]>()

  tracks.forEach((track) => {
    const label =
      mode === 'album'
        ? track.album || 'Unknown album'
        : track.artist || 'Unknown artist'
    const key = mode === 'album' ? label + '::' + track.artist : label
    const group = groups.get(key) ?? []

    group.push(track)
    groups.set(key, group)
  })

  return Array.from(groups, ([key, groupedTracks]) => {
    const first = groupedTracks[0]

    return {
      key,
      title:
        mode === 'album'
          ? first.album || 'Unknown album'
          : first.artist || 'Unknown artist',
      subtitle:
        mode === 'album'
          ? first.artist
          : groupedTracks.length === 1
            ? '1 song'
            : groupedTracks.length + ' songs',
      tracks: groupedTracks,
    }
  }).sort((left, right) => left.title.localeCompare(right.title))
}
