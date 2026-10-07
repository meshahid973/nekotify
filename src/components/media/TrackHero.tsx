import { Pause, Play } from 'lucide-react'

import { Button } from '@/components/primitives/Button'
import type { Track } from '@/types/media'

import './TrackHero.css'

interface TrackHeroProps {
  track: Track
  playing: boolean
  onToggle: () => void
}

export function TrackHero({ track, playing, onToggle }: TrackHeroProps) {
  return (
    <section
      className="track-hero"
      data-has-artwork={track.artwork ? 'true' : 'false'}
      aria-label="Featured track"
    >
      {track.artwork ? (
        <img
          className="track-hero__image"
          src={track.artwork.uri}
          alt=""
          aria-hidden="true"
        />
      ) : null}

      <div className="track-hero__overlay" aria-hidden="true" />

      <div className="track-hero__copy">
        <p className="eyebrow">Listen now</p>
        <h2>{track.title}</h2>
        <p className="track-hero__meta">
          <strong>{track.artist}</strong>
          <span>{track.album ?? 'Local files'}</span>
        </p>

        <Button onClick={onToggle}>
          {playing ? (
            <Pause size={15} fill="currentColor" aria-hidden="true" />
          ) : (
            <Play size={15} fill="currentColor" aria-hidden="true" />
          )}
          {playing ? 'Pause' : 'Play'}
        </Button>
      </div>
    </section>
  )
}
