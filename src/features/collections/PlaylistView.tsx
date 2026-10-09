import { ListMusic, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/primitives/Button'
import { useCollectionsStore } from '@/features/collections/collections.store'
import { PagedTrackList } from '@/features/library/PagedLibraryViews'
import { useLibraryStore } from '@/features/library/library.store'
import { acceptsTrackDrag,readTrackDrag } from '@/features/library/trackDrag'
import { notify } from '@/stores/toast.store'

import './PlaylistView.css'

export function PlaylistView() {
  const playlists = useCollectionsStore((state) => state.playlists)
  const error = useCollectionsStore((state) => state.error)
  const busy = useCollectionsStore((state) => state.busy)
  const revision=useCollectionsStore(s=>s.revision)
  const metadataRevision=useLibraryStore(s=>s.metadataRevision)
  const createPlaylist = useCollectionsStore((state) => state.createPlaylist)
  const deletePlaylist = useCollectionsStore((state) => state.deletePlaylist)
  const addToPlaylist = useCollectionsStore((state) => state.addToPlaylist)
  const removeFromPlaylist = useCollectionsStore((state) => state.removeFromPlaylist)
  const tracks = useLibraryStore((state) => state.tracks)
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dragTarget,setDragTarget] = useState<number|null>(null)
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
          <Button type="submit" size="sm" disabled={busy || !name.trim()}><Plus size={15}/> Create</Button>
        </form>
        {playlists.map((playlist) => (
          <button type="button" key={playlist.id}
            className="playlists-view__choice" data-selected={selected?.id === playlist.id}
            data-drop={dragTarget===playlist.id?'true':'false'}
            onDragOver={(event)=>{
              if(!acceptsTrackDrag(event.dataTransfer.types))return
              event.preventDefault();event.dataTransfer.dropEffect='copy'
              setDragTarget(playlist.id)
            }}
            onDragLeave={()=>setDragTarget(null)}
            onDrop={event=>{
              event.preventDefault();setDragTarget(null)
              const path=readTrackDrag(event.dataTransfer)
              if(!path)return
              if(playlist.trackPaths.includes(path)){notify('Already in playlist');return}
              void addToPlaylist(playlist.id,path)
              notify('Added to '+playlist.name,'info',{
                label:'Undo',run:()=>{
                  void useCollectionsStore.getState().removeFromPlaylist(playlist.id,path)
                },
              })
            }}
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
            <PagedTrackList mode="playlist" playlistId={selected.id}
              fallback={selectedTracks} refreshKey={revision+':'+metadataRevision}
              emptyTitle="Drag songs here, or use any track's Add to Playlist action."
              onRemoveFromPlaylist={track=>{
                void removeFromPlaylist(selected.id,track.source.path)
                notify('Removed from '+selected.name,'info',{
                  label:'Undo',run:()=>{
                    void useCollectionsStore.getState().addToPlaylist(selected.id,track.source.path)
                  },
                })
              }}/>
          </>
        ) : <p className="playlists-view__empty">Create your first playlist.</p>}
      </div>
    </section>
  )
}
