import { ArrowRight, FolderPlus, Music2, Library, Pause, Play } from 'lucide-react'
import { useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useNavigate } from 'react-router-dom'

import { Artwork } from '@/components/artwork/Artwork'
import { TrackHero } from '@/components/media/TrackHero'
import { QuickSpin } from '@/components/reactbits/QuickSpin'
import { ChromaAlbumGrid } from '@/components/reactbits/ChromaAlbumGrid'
import { FadeContent } from '@/components/reactbits/FadeContent'
import { useUiStore } from '@/stores/ui.store'
import { Button } from '@/components/primitives/Button'
import { useHistoryStore } from '@/features/history/history.store'
import { useLibraryStore } from '@/features/library/library.store'
import { playLibraryTrack } from '@/features/library/playLibraryTrack'
import { usePlaybackStore } from '@/features/playback/playback.store'
import type { Track } from '@/types/media'

import './HomePage.css'

interface AlbumCollection {
  key: string
  title: string
  artist: string
  artwork?: Track['artwork']
  songs: Track[]
}

function albumsFrom(tracks: Track[]): AlbumCollection[] {
  const groups = new Map<string, AlbumCollection>()
  for (const track of tracks) {
    if (!track.album?.trim()) continue
    const key = track.album + '\u001f' + track.artist
    const found = groups.get(key)
    if (found) {
      found.songs.push(track)
      if (!found.artwork && track.artwork) found.artwork = track.artwork
    } else {
      groups.set(key, {
        key, title: track.album, artist: track.artist,
        artwork: track.artwork, songs:[track],
      })
    }
  }
  return [...groups.values()].slice(0, 12)
}

export function HomePage() {
  const navigate = useNavigate()
  const reduceSystem=useReducedMotion()
  const motionPref=useUiStore((s)=>s.motionPreference)
  const reduced=Boolean(reduceSystem)||motionPref==='reduced'
  const quickWheelEnabled = useUiStore((s)=>s.quickWheelEnabled)
  const tracks = useLibraryStore((state) => state.tracks)
  const libraryStatus = useLibraryStore((state) => state.status)
  const importFolder = useLibraryStore((state) => state.importFolder)
  const currentTrack = usePlaybackStore((state) => state.track)
  const playbackStatus = usePlaybackStore((state) => state.status)
  const recentPaths = useHistoryStore((state) => state.recentPaths)

  const albums = useMemo(() => albumsFrom(tracks), [tracks])
  const recent = useMemo(() => {
    const byPath = new Map(tracks.map((track) => [track.source.path, track]))
    return recentPaths.flatMap((path) => {
      const track = byPath.get(path)
      return track ? [track] : []
    })
  }, [tracks, recentPaths])
  const featured = currentTrack ?? recent[0] ?? tracks[0]
  const featuredPlaying = featured?.id === currentTrack?.id &&
    (playbackStatus === 'playing' || playbackStatus === 'loading')
  const highlights = [...recent, ...tracks.filter((track) =>
    !recentPaths.includes(track.source.path))].slice(0, 9)
  const browseLibrary = () => navigate('/library')

  return (
    <div className="page home-page">
      <header className="home-heading">
        <div>
          <h1>Home</h1>
        </div>
        <div className="home-heading__summary">
          <span><strong>{tracks.length.toLocaleString()}</strong> songs</span>
          <span className="home-heading__separator" aria-hidden="true" />
          <span><strong>{albums.length.toLocaleString()}</strong> albums</span>
        </div>
      </header>

      {featured ? (
        <TrackHero track={featured} playing={Boolean(featuredPlaying)}
          onToggle={() => void playLibraryTrack(featured, tracks)}
          onLibrary={browseLibrary} />
      ) : (
        <section className="home-empty" aria-label="Import music">
          <div className="home-empty__symbol"><Music2 size={51} strokeWidth={1.15}/></div>
          <div className="home-empty__copy">
            <h2>Fill your space with sound.</h2>
            <p>Import a music folder to start.</p>
          </div>
          <Button disabled={libraryStatus === 'loading'}
            onClick={() => void importFolder()}>
            <FolderPlus size={17} aria-hidden="true"/>
            {libraryStatus === 'loading' ? 'Scanning…' : 'Add music'}
          </Button>
        </section>
      )}

      <section className="home-section" aria-labelledby="quick-picks-title">
        <div className="section-heading">
          <div><h2 id="quick-picks-title" className="section-heading__title">
              {recent.length ? 'Back in rotation' : 'Quick picks'}
            </h2>
          </div>
          <button type="button" className="home-section__link" onClick={browseLibrary}>
            View all <ArrowRight size={15} aria-hidden="true" />
          </button>
        </div>
        {highlights.length > 0 ? (
          <div className="home-track-grid">
            {highlights.map((track,index) => {
              const active = track.id === currentTrack?.id
              const playing = active && (playbackStatus === 'playing' || playbackStatus === 'loading')
              return (
                <motion.div key={track.id} className="nk-animated-list__item"
                  initial={reduced?false:{opacity:0,y:10}} animate={{opacity:1,y:0}}
                  transition={{duration:reduced?0:.25,delay:reduced?0:Math.min(.21,index*.028)}}>
                <button type="button" className="home-track"
                  data-active={active}
                  aria-label={(playing ? 'Pause ' : 'Play ') + track.title}
                  onClick={() => void playLibraryTrack(track, tracks)}>
                  <Artwork size="sm" src={track.artwork?.uri} alt="" />
                  <span className="home-track__copy">
                    <strong>{track.title}</strong><small>{track.artist}</small>
                  </span>
                  <span className="home-track__play" aria-hidden="true">
                    {playing ? <Pause size={18} fill="currentColor"/> :
                      <Play size={18} fill="currentColor"/>}
                  </span>
                </button>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="home-list-empty">
            <Library size={18} aria-hidden="true"/><span>Your songs will appear here.</span>
          </div>
        )}
      </section>

      {quickWheelEnabled ? <QuickSpin/> : null}

      {albums.length > 0 ? (
        <FadeContent><section className="home-section" aria-labelledby="albums-title">
          <div className="section-heading">
            <div><h2 className="section-heading__title" id="albums-title">Albums</h2>
            </div>
            <button type="button" className="home-section__link"
              onClick={() => navigate('/library?view=albums')}>
              Browse albums <ArrowRight size={15} aria-hidden="true"/>
            </button>
          </div>
          <ChromaAlbumGrid albums={albums.slice(0,6)}
            onPlay={(songs)=>{if(songs[0])void playLibraryTrack(songs[0],songs)}}/>
        </section></FadeContent>
      ) : null}
    </div>
  )
}
