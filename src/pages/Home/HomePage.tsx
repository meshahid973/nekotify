import { ArrowRight, AudioLines, Library, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/primitives/Button'
import { Surface } from '@/components/primitives/Surface'

import './HomePage.css'

export function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="page home-page">
      <section className="home-hero">
        <div className="home-hero__ambient" aria-hidden="true">
          <span className="home-hero__orb home-hero__orb--one" />
          <span className="home-hero__orb home-hero__orb--two" />
        </div>

        <div className="home-hero__content">
          <p className="eyebrow">Local-first listening</p>
          <h1>
            Your music,
            <br />
            <span>without the noise.</span>
          </h1>
          <p className="home-hero__description">
            Nekotify is ready for a local library that stays fast, private, and
            close to the music.
          </p>
          <div className="home-hero__actions">
            <Button onClick={() => navigate('/library')}>
              Explore Library
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
            <span className="home-hero__hint">
              Library importing arrives in Phase 2.
            </span>
          </div>
        </div>

        <div className="home-hero__visual" aria-hidden="true">
          <div className="home-hero__disc">
            <div className="home-hero__disc-ring" />
            <div className="home-hero__disc-center">
              <AudioLines size={28} />
            </div>
          </div>
          <div className="home-hero__visual-copy">
            <span>NEKOTIFY</span>
            <strong>Local library</strong>
            <small>ready for your sound</small>
          </div>
        </div>
      </section>

      <section className="home-foundation" aria-labelledby="foundation-title">
        <div className="home-foundation__heading">
          <div>
            <p className="eyebrow">Foundation</p>
            <h2 id="foundation-title">Built quiet. Ready to grow.</h2>
          </div>
          <span className="home-foundation__phase">Phase 1</span>
        </div>

        <div className="home-foundation__grid">
          <Surface className="home-foundation__card" tone="subtle">
            <span className="home-foundation__icon">
              <Library size={18} />
            </span>
            <strong>Library shell</strong>
            <p>
              Songs, albums, artists, and playlists have a clean home before
              native indexing lands.
            </p>
          </Surface>

          <Surface className="home-foundation__card" tone="subtle">
            <span className="home-foundation__icon">
              <AudioLines size={18} />
            </span>
            <strong>Persistent player</strong>
            <p>
              The player stays mounted while routes change, ready for the
              playback engine.
            </p>
          </Surface>

          <Surface className="home-foundation__card" tone="subtle">
            <span className="home-foundation__icon">
              <Sparkles size={18} />
            </span>
            <strong>Artwork-led design</strong>
            <p>
              The interface stays neutral so future album colors can become
              atmosphere rather than clutter.
            </p>
          </Surface>
        </div>
      </section>
    </div>
  )
}
