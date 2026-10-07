import { Pause, Play } from 'lucide-react'

import { Artwork } from '@/components/artwork/Artwork'
import { formatPlaybackTime } from '@/features/playback/playback.utils'
import type { Track } from '@/types/media'

import './TrackRow.css'

interface TrackRowProps {
  track: Track
  active?: boolean
  playing?: boolean
  onPlay: () => void
}

export function TrackRow({
  track,
  active = false,
  playing = false,
  onPlay,
}: TrackRowProps) {
  return (
    <div className="track-row" data-active={active ? 'true' : 'false'}>
      <button
        type="button"
        className="track-row__play"
        aria-label={(playing ? 'Pause ' : 'Play ') + track.title}
        onClick={onPlay}
      >
        {playing ? (
          <Pause size={15} fill="currentColor" />
        ) : (
          <Play size={15} fill="currentColor" />
        )}
      </button>

      <Artwork
        size="sm"
        src={track.artwork?.uri}
        alt={track.artwork?.alt ?? ''}
      />

      <div className="track-row__identity">
        <strong>{track.title}</strong>
        <span>{track.artist}</span>
      </div>

      <span className="track-row__album">{track.album ?? 'Local files'}</span>

      <time className="track-row__duration">
        {formatPlaybackTime(track.duration)}
      </time>
    </div>
  )
}
