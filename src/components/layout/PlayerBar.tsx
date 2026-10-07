import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'

import { Artwork } from '@/components/artwork/Artwork'
import { IconButton } from '@/components/primitives/IconButton'
import { Slider } from '@/components/primitives/Slider'
import { usePlaybackStore } from '@/features/playback/playback.store'
import { formatPlaybackTime } from '@/features/playback/playback.utils'
import { useQueueStore } from '@/features/queue/queue.store'

import './PlayerBar.css'

export function PlayerBar() {
  const track = usePlaybackStore((state) => state.track)
  const status = usePlaybackStore((state) => state.status)
  const currentTime = usePlaybackStore((state) => state.currentTime)
  const duration = usePlaybackStore((state) => state.duration)
  const volume = usePlaybackStore((state) => state.volume)
  const muted = usePlaybackStore((state) => state.muted)
  const togglePlayback = usePlaybackStore((state) => state.togglePlayback)
  const seek = usePlaybackStore((state) => state.seek)
  const setVolume = usePlaybackStore((state) => state.setVolume)
  const toggleMuted = usePlaybackStore((state) => state.toggleMuted)

  const items = useQueueStore((state) => state.items)
  const currentIndex = useQueueStore((state) => state.currentIndex)
  const advance = useQueueStore((state) => state.advance)
  const previous = useQueueStore((state) => state.previous)
  const loadTrack = usePlaybackStore((state) => state.loadTrack)
  const play = usePlaybackStore((state) => state.play)

  const hasTrack = track !== null
  const canPrevious = currentIndex > 0
  const canNext = currentIndex >= 0 && currentIndex < items.length - 1
  const isPlaying = status === 'playing' || status === 'loading'

  const playPrevious = async () => {
    const previousTrack = previous()

    if (!previousTrack) {
      return
    }

    loadTrack(previousTrack)
    try {
      await play()
    } catch {
      // AudioEngine owns the error state.
    }
  }

  const playNext = async () => {
    const nextTrack = advance()

    if (!nextTrack) {
      return
    }

    loadTrack(nextTrack)
    try {
      await play()
    } catch {
      // AudioEngine owns the error state.
    }
  }

  return (
    <footer className="player-bar" aria-label="Player">
      <div className="player-bar__track">
        <Artwork
          size="sm"
          src={track?.artwork?.uri}
          alt={track?.artwork?.alt ?? ''}
        />
        <div className="player-bar__track-copy">
          <strong>{track?.title ?? 'Nothing playing'}</strong>
          <span>{track?.artist ?? 'No track selected'}</span>
        </div>
      </div>

      <div className="player-bar__transport">
        <div className="player-bar__buttons" aria-label="Playback controls">
          <IconButton
            label="Previous track"
            disabled={!canPrevious}
            size="sm"
            onClick={() => void playPrevious()}
          >
            <SkipBack size={17} />
          </IconButton>

          <IconButton
            className="player-bar__play"
            label={isPlaying ? 'Pause' : 'Play'}
            disabled={!hasTrack}
            size="md"
            onClick={() => void togglePlayback()}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </IconButton>

          <IconButton
            label="Next track"
            disabled={!canNext}
            size="sm"
            onClick={() => void playNext()}
          >
            <SkipForward size={17} />
          </IconButton>
        </div>

        <div className="player-bar__timeline">
          <span>{formatPlaybackTime(currentTime)}</span>
          <Slider
            label="Seek"
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            value={Math.min(currentTime, Math.max(duration, 1))}
            disabled={!hasTrack || duration <= 0}
            onValueChange={seek}
          />
          <span>{formatPlaybackTime(duration)}</span>
        </div>
      </div>

      <div className="player-bar__utilities">
        <IconButton
          label={muted ? 'Unmute' : 'Mute'}
          size="sm"
          onClick={toggleMuted}
        >
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </IconButton>
        <Slider
          className="player-bar__volume"
          label="Volume"
          value={muted ? 0 : volume}
          onValueChange={(value) => {
            if (muted) {
              toggleMuted()
            }
            setVolume(value)
          }}
        />
      </div>
    </footer>
  )
}
