import { FolderPlus, Library, Pause, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Artwork } from '@/components/artwork/Artwork'
import { Button } from '@/components/primitives/Button'
import { useLibraryStore } from '@/features/library/library.store'
import { playLibraryTrack } from '@/features/library/playLibraryTrack'
import { usePlaybackStore } from '@/features/playback/playback.store'

import './HomePage.css'

export function HomePage() {
  const navigate = useNavigate()
  const tracks = useLibraryStore((state) => state.tracks)
  const libraryStatus = useLibraryStore((state) => state.status)
  const importFolder = useLibraryStore((state) => state.importFolder)
  const currentTrack = usePlaybackStore((state) => state.track)
  const playbackStatus = usePlaybackStore((state) => state.status)
  const featured = currentTrack ?? tracks[0]
  const featuredPlaying =
    featured?.id === currentTrack?.id &&
    (playbackStatus === 'playing' || playbackStatus === 'loading')
  const listenNow = tracks.slice(0, 8)

  return (
    <div className="page home-page">
      <header className="home-heading">
        <p className="eyebrow">Local player</p>
        <h1>Home</h1>
      </header>

      {featured ? (
        <section className="home-feature" aria-label="Featured track">
          <Artwork
            size="lg"
            src={featured.artwork?.uri}
            alt={featured.artwork?.alt ?? ''}
          />

          <div className="home-feature__copy">
            <p className="eyebrow">Listen now</p>
            <h2>{featured.title}</h2>
            <p>
              {featured.artist}
              {featured.album ? ' · ' + featured.album : ''}
            </p>
            <Button onClick={() => void playLibraryTrack(featured, tracks)}>
              {featuredPlaying ? (
                <Pause size={15} fill="currentColor" aria-hidden="true" />
              ) : (
                <Play size={15} fill="currentColor" aria-hidden="true" />
              )}
              {featuredPlaying ? 'Pause' : 'Play'}
            </Button>
          </div>
        </section>
      ) : (
        <section className="home-empty">
          <div>
            <p className="eyebrow">Library</p>
            <h2>Add your music</h2>
          </div>
          <Button
            disabled={libraryStatus === 'loading'}
            onClick={() => void importFolder()}
          >
            <FolderPlus size={16} aria-hidden="true" />
            {libraryStatus === 'loading' ? 'Scanning…' : 'Add folder'}
          </Button>
        </section>
      )}

      <section className="home-section" aria-labelledby="listen-now-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Library</p>
            <h2 className="section-heading__title" id="listen-now-title">
              Listen now
            </h2>
          </div>
          <button
            type="button"
            className="home-section__link"
            onClick={() => navigate('/library')}
          >
            Library
          </button>
        </div>

        {listenNow.length > 0 ? (
          <div className="home-track-grid">
            {listenNow.map((track) => {
              const playing =
                track.id === currentTrack?.id &&
                (playbackStatus === 'playing' || playbackStatus === 'loading')

              return (
                <button
                  type="button"
                  className="home-track"
                  data-active={track.id === currentTrack?.id ? 'true' : 'false'}
                  key={track.id}
                  onClick={() => void playLibraryTrack(track, tracks)}
                >
                  <Artwork
                    size="sm"
                    src={track.artwork?.uri}
                    alt={track.artwork?.alt ?? ''}
                  />
                  <span className="home-track__copy">
                    <strong>{track.title}</strong>
                    <small>{track.artist}</small>
                  </span>
                  {playing ? (
                    <Pause
                      className="home-track__play"
                      size={14}
                      fill="currentColor"
                      aria-hidden="true"
                    />
                  ) : (
                    <Play
                      className="home-track__play"
                      size={14}
                      fill="currentColor"
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="home-list-empty">
            <Library size={16} aria-hidden="true" />
            <span>No songs yet</span>
          </div>
        )}
      </section>
    </div>
  )
}
