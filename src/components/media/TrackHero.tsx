import { Music2, Pause, Play } from 'lucide-react'

import { Button } from '@/components/primitives/Button'
import type { Track } from '@/types/media'

import './TrackHero.css'

interface TrackHeroProps {
  track: Track
  playing: boolean
  onToggle: () => void
  onLibrary?: () => void
}

export function TrackHero({
  track, playing, onToggle, onLibrary,
}: TrackHeroProps) {
  return (
    <section className="track-hero" data-has-artwork={Boolean(track.artwork)}
      aria-label="Featured music">
      {track.artwork ? (
        <>
          <img key={track.id + '-wash'} className="track-hero__wash"
            src={track.artwork.uri} alt="" aria-hidden="true" />
          <img key={track.id} className="track-hero__image"
            src={track.artwork.uri} alt="" aria-hidden="true" />
        </>
      ) : (
        <Music2 className="track-hero__placeholder" aria-hidden="true" />
      )}
      <div className="track-hero__overlay" aria-hidden="true" />
      <div className="track-hero__copy">
        <div className="track-hero__eyebrow"><span className="track-hero__dot" />
          {playing ? 'NOW PLAYING' : 'FEATURED FROM YOUR LIBRARY'}
        </div>
        <h2 title={track.title}>{track.title}</h2>
        <p className="track-hero__meta">
          <strong>{track.artist}</strong>
          {track.album ? <><span className="track-hero__bullet">•</span><span>{track.album}</span></> : null}
        </p>
        <div className="track-hero__actions">
          <Button size="md" onClick={onToggle}>
            {playing
              ? <Pause size={18} fill="currentColor" aria-hidden="true" />
              : <Play size={18} fill="currentColor" aria-hidden="true" />}
            {playing ? 'Pause' : 'Play now'}
          </Button>
          {onLibrary ? (
            <Button variant="secondary" size="md" onClick={onLibrary}>
              Browse library
            </Button>
          ) : null}
        </div>
      </div>
      <span className="track-hero__edge-label" aria-hidden="true">NEKOTIFY / LOCAL MUSIC</span>
    </section>
  )
}
