import { ArrowRight, Library, Music2, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/primitives/Button'

import './HomePage.css'

export function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="page home-page">
      <section className="home-intro">
        <div className="home-intro__copy">
          <p className="eyebrow">Nekotify</p>
          <h1>
            your music,
            <br />
            <span>without the noise.</span>
          </h1>
          <p>
            A fast local player with the same cinematic restraint as NekoWatch:
            dark chrome, artwork-led atmosphere, and the music left in front.
          </p>
          <div className="home-intro__actions">
            <Button onClick={() => navigate('/library')}>
              Open library
              <ArrowRight size={15} aria-hidden="true" />
            </Button>
            <button
              type="button"
              className="home-intro__text-action"
              onClick={() => navigate('/search')}
            >
              Search
            </button>
          </div>
        </div>

        <div className="home-intro__visual" aria-hidden="true">
          <div className="home-intro__artwork-stack home-intro__artwork-stack--back" />
          <div className="home-intro__artwork-stack home-intro__artwork-stack--mid" />
          <div className="home-intro__artwork-stack home-intro__artwork-stack--front">
            <Music2 size={34} strokeWidth={1.5} />
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="quick-library-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Library</p>
            <h2 className="section-heading__title" id="quick-library-title">
              quick library
            </h2>
          </div>
          <span className="section-heading__meta">0 songs</span>
        </div>

        <div className="quick-library-empty">
          <span className="quick-library-empty__icon" aria-hidden="true">
            <Library size={22} />
          </span>
          <div>
            <strong>Your library will live here.</strong>
            <p>
              Phase 2 connects local folders and fills this shelf with compact
              artwork-first music tiles rather than dashboard panels.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/library')}>
            View library
          </Button>
        </div>
      </section>

      <section className="home-section" aria-labelledby="listen-now-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Listen</p>
            <h2 className="section-heading__title" id="listen-now-title">
              listen now
            </h2>
          </div>
        </div>

        <div className="listen-now-empty">
          <Search size={17} aria-hidden="true" />
          <span>
            Recently played and recommendations stay empty until there is real
            local history to show.
          </span>
        </div>
      </section>
    </div>
  )
}
