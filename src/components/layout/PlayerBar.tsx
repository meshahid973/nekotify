import {
  ListMusic,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react'

import { Artwork } from '@/components/artwork/Artwork'
import { IconButton } from '@/components/primitives/IconButton'

import './PlayerBar.css'

export function PlayerBar() {
  return (
    <footer className="player-bar" aria-label="Player">
      <div className="player-bar__track">
        <Artwork size="sm" alt="" />
        <div className="player-bar__track-copy">
          <strong>Nothing playing</strong>
          <span>Your music will stay here while you browse.</span>
        </div>
      </div>

      <div className="player-bar__transport">
        <div className="player-bar__buttons" aria-label="Playback controls">
          <IconButton label="Previous track" disabled size="sm">
            <SkipBack size={17} />
          </IconButton>
          <IconButton
            className="player-bar__play"
            label="Play"
            disabled
            size="md"
          >
            <Play size={18} fill="currentColor" />
          </IconButton>
          <IconButton label="Next track" disabled size="sm">
            <SkipForward size={17} />
          </IconButton>
        </div>

        <div className="player-bar__timeline" aria-hidden="true">
          <span>0:00</span>
          <div className="player-bar__timeline-track" />
          <span>0:00</span>
        </div>
      </div>

      <div className="player-bar__utilities">
        <IconButton label="Queue" disabled size="sm">
          <ListMusic size={17} />
        </IconButton>
        <IconButton label="Volume" disabled size="sm">
          <Volume2 size={17} />
        </IconButton>
      </div>
    </footer>
  )
}
