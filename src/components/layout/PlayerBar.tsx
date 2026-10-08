import { ListMusic, Maximize2, Volume2, VolumeX } from 'lucide-react'

import { Artwork } from '@/components/artwork/Artwork'
import { IconButton } from '@/components/primitives/IconButton'
import { Slider } from '@/components/primitives/Slider'
import { TransportControls } from '@/components/player/TransportControls'
import { usePlaybackStore } from '@/features/playback/playback.store'
import { usePlayerPanelsStore } from '@/features/playback/player-panels.store'
import { formatPlaybackTime } from '@/features/playback/playback.utils'

import './PlayerBar.css'

export function PlayerBar() {
  const track = usePlaybackStore((state) => state.track)
  const currentTime = usePlaybackStore((state) => state.currentTime)
  const duration = usePlaybackStore((state) => state.duration)
  const volume = usePlaybackStore((state) => state.volume)
  const muted = usePlaybackStore((state) => state.muted)
  const seek = usePlaybackStore((state) => state.seek)
  const setVolume = usePlaybackStore((state) => state.setVolume)
  const toggleMuted = usePlaybackStore((state) => state.toggleMuted)
  const panel = usePlayerPanelsStore((state) => state.openPanel)
  const togglePanel = usePlayerPanelsStore((state) => state.togglePanel)

  return (
    <footer className="player-bar" aria-label="Player">
      <div className="player-bar__track">
        <button
          type="button"
          className="player-bar__artwork-action"
          disabled={!track}
          title="Expand Now Playing"
          aria-label="Expand Now Playing"
          onClick={() => togglePanel('now-playing')}
        >
          <Artwork size="sm" src={track?.artwork?.uri} alt={track?.artwork?.alt ?? ''} />
        </button>
        <div className="player-bar__track-copy">
          <strong>{track?.title ?? 'Nothing playing'}</strong>
          <span>{track?.artist ?? 'No track selected'}</span>
        </div>
      </div>

      <div className="player-bar__transport">
        <TransportControls />
        <div className="player-bar__timeline">
          <span>{formatPlaybackTime(currentTime)}</span>
          <Slider
            label="Seek" min={0} max={Math.max(duration, 1)} step={0.1}
            value={Math.min(currentTime, Math.max(duration, 1))}
            disabled={!track || duration <= 0} onValueChange={seek}
          />
          <span>{formatPlaybackTime(duration)}</span>
        </div>
      </div>

      <div className="player-bar__utilities">
        <IconButton
          label={panel === 'queue' ? 'Close queue' : 'Show queue'}
          aria-pressed={panel === 'queue'}
          size="sm"
          onClick={() => togglePanel('queue')}
        ><ListMusic size={17} /></IconButton>
        <IconButton
          label={panel === 'now-playing' ? 'Close Now Playing' : 'Expand Now Playing'}
          aria-pressed={panel === 'now-playing'}
          disabled={!track}
          size="sm"
          onClick={() => togglePanel('now-playing')}
        ><Maximize2 size={16}/></IconButton>
        <IconButton label={muted ? 'Unmute' : 'Mute'} size="sm" onClick={toggleMuted}>
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </IconButton>
        <Slider className="player-bar__volume" label="Volume"
          value={muted ? 0 : volume}
          onValueChange={(value) => {
            if (muted) toggleMuted()
            setVolume(value)
          }}
        />
      </div>
    </footer>
  )
}
