import { Heart, ListPlus, Paintbrush, Pause, Play } from 'lucide-react'

import { Artwork } from '@/components/artwork/Artwork'
import { useCollectionsStore } from '@/features/collections/collections.store'
import { formatPlaybackTime } from '@/features/playback/playback.utils'
import { useQueueStore } from '@/features/queue/queue.store'
import { useCoverPickerStore } from '@/features/library/cover-picker.store'
import type { Track } from '@/types/media'

import './TrackRow.css'

interface TrackRowProps {
  track: Track
  active?: boolean
  playing?: boolean
  onPlay: () => void
}

export function TrackRow({
  track, active = false, playing = false, onPlay,
}: TrackRowProps) {
  const favorites = useCollectionsStore((state) => state.favorites)
  const playlists = useCollectionsStore((state) => state.playlists)
  const toggleFavorite = useCollectionsStore((state) => state.toggleFavorite)
  const addToPlaylist = useCollectionsStore((state) => state.addToPlaylist)
  const favorite = favorites.includes(track.source.path)

  return (
    <div className="track-row" data-active={active ? 'true' : 'false'}>
      <button type="button" className="track-row__play"
        aria-label={(playing ? 'Pause ' : 'Play ') + track.title} onClick={onPlay}>
        {playing ? <Pause size={15} fill="currentColor" /> :
          <Play size={15} fill="currentColor" />}
      </button>
      <Artwork size="sm" src={track.artwork?.uri} alt={track.artwork?.alt ?? ''} />
      <div className="track-row__identity">
        <strong>{track.title}</strong><span>{track.artist}</span>
      </div>
      <span className="track-row__album">{track.album ?? 'Local files'}</span>
      <time className="track-row__duration">{formatPlaybackTime(track.duration)}</time>
      <div className="track-row__actions">
        <button
          className={favorite ? 'track-row__icon track-row__icon--active' : 'track-row__icon'}
          type="button" aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorite}
          onClick={() => void toggleFavorite(track.source.path)}
        ><Heart size={16} fill={favorite ? 'currentColor' : 'none'}/></button>
        <button type="button" className="track-row__icon"
          title="Play next" aria-label={'Play ' + track.title + ' next'}
          onClick={() => useQueueStore.getState().playNext(track)}
        ><ListPlus size={16}/></button>
        <button type="button" className="track-row__icon"
          aria-label={'Choose artwork for ' + track.title}
          title="Choose artwork"
          onClick={() => useCoverPickerStore.getState().open(track.source.path)}
        ><Paintbrush size={15}/></button>
        {playlists.length > 0 ? (
          <select
            className="track-row__playlist"
            aria-label={'Add ' + track.title + ' to playlist'}
            value=""
            onChange={(event) => {
              const id = Number(event.currentTarget.value)
              if (id) void addToPlaylist(id, track.source.path)
            }}
          >
            <option value="">Playlist…</option>
            {playlists.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  )
}
