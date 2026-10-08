import {
  Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward,
} from 'lucide-react'

import { IconButton } from '@/components/primitives/IconButton'
import { usePlaybackStore } from '@/features/playback/playback.store'

import './TransportControls.css'

export function TransportControls() {
  const status = usePlaybackStore((state) => state.status)
  const track = usePlaybackStore((state) => state.track)
  const repeatMode = usePlaybackStore((state) => state.repeatMode)
  const shuffle = usePlaybackStore((state) => state.shuffle)
  const setRepeatMode = usePlaybackStore((state) => state.setRepeatMode)
  const setShuffle = usePlaybackStore((state) => state.setShuffle)
  const togglePlayback = usePlaybackStore((state) => state.togglePlayback)
  const next = usePlaybackStore((state) => state.next)
  const previous = usePlaybackStore((state) => state.previous)
  const playing = status === 'playing' || status === 'loading'
  const cycleRepeat = () => setRepeatMode(
    repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off',
  )

  return (
    <div className="transport-controls" aria-label="Playback controls">
      <IconButton
        label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
        size="sm"
        disabled={!track}
        aria-pressed={shuffle}
        className={shuffle ? 'transport-controls__active' : ''}
        onClick={() => setShuffle(!shuffle)}
      >
        <Shuffle size={16} aria-hidden="true" />
      </IconButton>
      <IconButton
        label="Previous track"
        size="sm"
        disabled={!track}
        onClick={() => void previous().catch(() => undefined)}
      >
        <SkipBack size={17} aria-hidden="true" />
      </IconButton>
      <IconButton
        className="transport-controls__play"
        label={playing ? 'Pause' : 'Play'}
        disabled={!track}
        size="md"
        onClick={() => void togglePlayback().catch(() => undefined)}
      >
        {playing ? <Pause size={19} fill="currentColor" aria-hidden="true" /> :
          <Play size={19} fill="currentColor" aria-hidden="true" />}
      </IconButton>
      <IconButton
        label="Next track"
        size="sm"
        disabled={!track}
        onClick={() => void next().catch(() => undefined)}
      >
        <SkipForward size={17} aria-hidden="true" />
      </IconButton>
      <IconButton
        label={repeatMode === 'off' ? 'Repeat off' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one'}
        size="sm"
        disabled={!track}
        aria-pressed={repeatMode !== 'off'}
        className={repeatMode !== 'off' ? 'transport-controls__active' : ''}
        onClick={cycleRepeat}
      >
        {repeatMode === 'one' ? <Repeat1 size={16} aria-hidden="true" /> :
          <Repeat size={16} aria-hidden="true" />}
      </IconButton>
    </div>
  )
}
