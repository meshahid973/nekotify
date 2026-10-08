import { ArrowUpRight, Music2, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { VirtualTrackList } from '@/features/library/VirtualTrackList'
import { useLibraryStore } from '@/features/library/library.store'
import './SearchPage.css'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const tracks = useLibraryStore((state) => state.tracks)
  const normalizedQuery = query.trim().toLocaleLowerCase()

  const results = useMemo(() =>
    normalizedQuery
      ? tracks.filter((track) =>
        [track.title, track.artist, track.album]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase().includes(normalizedQuery)),
      )
      : [],
    [normalizedQuery, tracks],
  )

  const artists = useMemo(() => {
    const names = new Set<string>()
    for (const track of tracks) {
      if (track.artist && track.artist !== 'Unknown artist') names.add(track.artist)
      if (names.size === 6) break
    }
    return [...names]
  }, [tracks])

  return (
    <div className="page search-page">
      <PageHeader title="Search" />

      <label className="search-field">
        <Search size={21} aria-hidden="true" />
        <input
          id="nekotify-search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="What do you want to listen to?"
          aria-label="Search songs, albums, or artists"
          autoComplete="off"
          spellCheck={false}
          autoFocus
        />
        <kbd>Ctrl K</kbd>
      </label>

      {normalizedQuery ? (
        <section className="search-results" aria-live="polite">
          <div className="search-results__header">
            <span>SEARCH RESULTS</span>
            <strong>{results.length} {results.length === 1 ? 'song' : 'songs'}</strong>
          </div>
          {results.length > 0 ? (
            <VirtualTrackList tracks={results} />
          ) : (
            <div className="search-empty">
              <Search size={28} aria-hidden="true"/>
              <strong>No matches found</strong>
              <span>Try a different title, artist, or album.</span>
            </div>
          )}
        </section>
      ) : (
        <section className="search-discover">
          <div className="search-discover__headline">
            <Music2 size={20} aria-hidden="true"/>
            <span>{tracks.length ? 'Start with an artist' : 'Your collection is waiting'}</span>
          </div>
          {artists.length > 0 ? (
            <div className="search-discover__artists">
              {artists.map((artist) => (
                <button type="button" key={artist} onClick={() => setQuery(artist)}>
                  <span>{artist}</span><ArrowUpRight size={18} aria-hidden="true"/>
                </button>
              ))}
            </div>
          ) : (
            <p>{tracks.length ? 'Start typing above to explore your library.' :
              'Import music to discover songs and artists.'}</p>
          )}
        </section>
      )}
    </div>
  )
}
