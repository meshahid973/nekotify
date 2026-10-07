import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { playLibraryTrack } from '@/features/library/playLibraryTrack'
import { TrackRow } from '@/features/library/TrackRow'
import { useLibraryStore } from '@/features/library/library.store'
import { usePlaybackStore } from '@/features/playback/playback.store'

import './SearchPage.css'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const tracks = useLibraryStore((state) => state.tracks)
  const currentTrack = usePlaybackStore((state) => state.track)
  const playbackStatus = usePlaybackStore((state) => state.status)
  const normalizedQuery = query.trim().toLowerCase()

  const results = useMemo(
    () =>
      normalizedQuery
        ? tracks.filter((track) =>
            [track.title, track.artist, track.album]
              .filter(Boolean)
              .some((value) => value!.toLowerCase().includes(normalizedQuery)),
          )
        : [],
    [normalizedQuery, tracks],
  )

  return (
    <div className="page search-page">
      <PageHeader eyebrow="Library" title="Search" />

      <label className="search-field">
        <Search size={17} aria-hidden="true" />
        <input
          id="nekotify-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search songs, albums, or artists"
          aria-label="Search songs, albums, or artists"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        <kbd>Ctrl K</kbd>
      </label>

      <section className="search-results" aria-live="polite">
        {normalizedQuery ? (
          results.length > 0 ? (
            results.map((track) => {
              const active = currentTrack?.id === track.id
              return (
                <TrackRow
                  key={track.id}
                  track={track}
                  active={active}
                  playing={\n                    active &&\n                    (playbackStatus === 'playing' || playbackStatus === 'loading')\n                  }
                  onPlay={() => void playLibraryTrack(track, results)}
                />
              )
            })
          ) : (
            <p>No results</p>
          )
        ) : (
          <p>{tracks.length > 0 ? 'Search your library' : 'No songs yet'}</p>
        )}
      </section>
    </div>
  )
}
