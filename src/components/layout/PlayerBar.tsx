import { ListMusic, Maximize2, Volume2, VolumeX } from 'lucide-react'

import { Artwork } from '@/components/artwork/Artwork'
import { IconButton } from '@/components/primitives/IconButton'
import { Slider } from '@/components/primitives/Slider'
import { ElasticVolumeSlider } from '@/components/reactbits/ElasticVolumeSlider'
import { PulseHeart } from '@/components/reactbits/PulseHeart'
import { TransportControls } from '@/components/player/TransportControls'
import { useCollectionsStore } from '@/features/collections/collections.store'
import { usePlaybackStore } from '@/features/playback/playback.store'
import { usePlayerPanelsStore } from '@/features/playback/player-panels.store'
import { formatPlaybackTime } from '@/features/playback/playback.utils'

import './PlayerBar.css'

export function PlayerBar() {
  const track = usePlaybackStore((state) => state.track)
  const status = usePlaybackStore((state) => state.status)
  const currentTime = usePlaybackStore((state) => state.currentTime)
  const duration = usePlaybackStore((state) => state.duration)
  const bufferedEnd = usePlaybackStore((state) => state.bufferedEnd)
  const volume = usePlaybackStore((state) => state.volume)
  const muted = usePlaybackStore((state) => state.muted)
  const seek = usePlaybackStore((state) => state.seek)
  const setVolume = usePlaybackStore((state) => state.setVolume)
  const toggleMuted = usePlaybackStore((state) => state.toggleMuted)
  const favorites = useCollectionsStore((state) => state.favorites)
  const toggleFavorite = useCollectionsStore((state) => state.toggleFavorite)
  const panel = usePlayerPanelsStore((state) => state.openPanel)
  const togglePanel = usePlayerPanelsStore((state) => state.togglePanel)
  const playing = status === 'playing' || status === 'loading'
  const liked = track ? favorites.includes(track.source.path) : false

  return (
    <footer className="player-bar" aria-label="Music player">
      <div className="player-bar__track">
        <button type="button" className="player-bar__artwork-action"
          disabled={!track} title="Open Now Playing"
          aria-label="Open Now Playing" onClick={() => togglePanel('now-playing')}>
          <Artwork size="sm" src={track?.artwork?.uri} alt="" />
        </button>
        <div className="player-bar__track-copy">
          <strong title={track?.title}>{track?.title ?? 'Nothing playing'}</strong>
          <span title={track?.artist}>{track?.artist ?? 'Choose a song to begin'}</span>
        </div>
        {track ? (
          <IconButton className="player-bar__favorite"
            label={liked ? 'Remove from liked songs' : 'Add to liked songs'}
            aria-pressed={liked} size="sm"
            onClick={() => void toggleFavorite(track.source.path)}>
            <PulseHeart liked={liked} size={18}/>
          </IconButton>
        ) : null}
      </div>

      <div className="player-bar__transport">
        <TransportControls />
        <div className="player-bar__timeline">
          <span>{formatPlaybackTime(currentTime)}</span>
          <Slider label="Seek" min={0} max={Math.max(duration,1)} step={0.1}
            value={Math.min(currentTime,Math.max(duration,1))}
            buffered={bufferedEnd} formatValue={formatPlaybackTime}
            disabled={!track || duration <= 0} onValueChange={seek}/>
          <span>{formatPlaybackTime(duration)}</span>
        </div>
      </div>

      <div className="player-bar__utilities">
        {playing && track ? (
          <span className="player-bar__equalizer" aria-label="Playing">
            <i/><i/><i/>
          </span>
        ) : null}
        <IconButton label={panel === 'queue' ? 'Close queue' : 'Open queue'}
          aria-pressed={panel === 'queue'} size="sm"
          onClick={() => togglePanel('queue')}>
          <ListMusic size={19}/>
        </IconButton>
        <IconButton label={panel === 'now-playing' ? 'Close Now Playing' : 'Expand Now Playing'}
          aria-pressed={panel === 'now-playing'} disabled={!track} size="sm"
          onClick={() => togglePanel('now-playing')}>
          <Maximize2 size={17}/>
        </IconButton>
        <div className="player-bar__volume-control">
          <IconButton label={muted ? 'Unmute' : 'Mute'} size="sm" onClick={toggleMuted}>
            {muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
          </IconButton>
          <ElasticVolumeSlider value={muted ? 0 : volume} onValueChange={(value) => {
            if (muted) toggleMuted()
            setVolume(value)
          }}/>
        </div>
      </div>
    </footer>
  )
}
