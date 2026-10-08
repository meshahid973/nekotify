import { ListMusic, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/primitives/Button'
import { useCollectionsStore } from '@/features/collections/collections.store'
import { VirtualTrackList } from '@/features/library/VirtualTrackList'
import { useLibraryStore } from '@/features/library/library.store'

import './PlaylistView.css'

export function PlaylistView() {
  const playlists = useCollectionsStore((state) => state.playlists)
  const error = useCollectionsStore((state) => state.error)
  const busy = useCollectionsStore((state) => state.busy)
  const createPlaylist = useCollectionsStore((state) => state.createPlaylist)
  const deletePlaylist = useCollectionsStore((state) => state.deletePlaylist)
  const tracks = useLibraryStore((state) => state.tracks)
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = playlists.find((item) => item.id === selectedId) ?? playlists[0]
  const selectedPaths = selected?.trackPaths
  const selectedTracks = useMemo(() => {
    if (!selectedPaths) return []
    const lookup = new Map(tracks.map((track) => [track.source.path, track]))
    return selectedPaths.flatMap((path) => {
      const track = lookup.get(path)
      return track ? [track] : []
    })
  }, [selectedPaths, tracks])

  const create = () => {
    const clean = name.trim()
    if (!clean) return
    void createPlaylist(clean)
    setName('')
  }

  return (
    <section className="playlists-view" aria-label="Playlists">
      <div className="playlists-view__sidebar">
        <form className="playlists-view__create" onSubmit={(event) => { event.preventDefault(); create() }}>
          <input value={name} onChange={(event) => setName(event.currentTarget.value)}
            maxLength={80} placeholder="New playlist" aria-label="New playlist name"/>
          <Button size="sm" disabled={busy || !name.trim()}><Plus size={15}/> Create</Button>
        </form>
        {playlists.map((playlist) => (
          <button type="button" key={playlist.id}
            className="playlists-view__choice" data-selected={selected?.id === playlist.id}
            onClick={() => setSelectedId(playlist.id)}
          >
            <ListMusic size={17}/>
            <span>{playlist.name}<small>{playlist.trackPaths.length} songs</small></span>
          </button>
        ))}
        {error ? <p role="alert" className="library-error">{error}</p> : null}
      </div>
      <div className="playlists-view__tracks">
        {selected ? (
          <>
            <div className="playlists-view__heading">
              <h3>{selected.name}</h3>
              <button type="button" aria-label={'Delete playlist ' + selected.name}
                title="Delete playlist" disabled={busy} onClick={() => {
                  if (window.confirm('Delete ' + selected.name + '?')) void deletePlaylist(selected.id)
                }}
              ><Trash2 size={17}/></button>
            </div>
            {selectedTracks.length ? <VirtualTrackList tracks={selectedTracks}/> :
              <p className="playlists-view__empty">Add songs from the Library.</p>}
          </>
        ) : <p className="playlists-view__empty">Create your first playlist.</p>}
      </div>
    </section>
  )
}
