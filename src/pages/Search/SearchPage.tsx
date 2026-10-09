import { ArrowUpRight, Music2, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { isTauri } from '@tauri-apps/api/core'

import { PageHeader } from '@/components/layout/PageHeader'
import { VirtualTrackList } from '@/features/library/VirtualTrackList'
import { useLibraryStore } from '@/features/library/library.store'
import { nativeTrackSearch, resolveNativeTrack } from '@/features/library/nativeQueries'
import type { Track } from '@/types/media'
import './SearchPage.css'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const tracks = useLibraryStore((state) => state.tracks)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const native = isTauri()
  const [nativeResults,setNativeResults] = useState<Track[]>([])
  const [nativeTotal,setNativeTotal] = useState(0)
  const [loading,setLoading] = useState(false)
  const [loadingMore,setLoadingMore] = useState(false)
  const [nativeError,setNativeError] = useState(false)
  const trackIndex = useMemo(()=>new Map(tracks.map(t=>[t.source.path,t])),[tracks])

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

  useEffect(()=>{
    if(!native || !normalizedQuery){
      return
    }
    let active=true
    const timer=window.setTimeout(()=>{
      setLoading(true)
      void nativeTrackSearch(normalizedQuery,0,80).then(page=>{
        if(!active)return
        setNativeResults(page.items.map(t=>resolveNativeTrack(t,trackIndex)))
        setNativeTotal(page.total)
        setNativeError(false)
      }).catch(()=>{
        if(active)setNativeError(true)
      }).finally(()=>{if(active)setLoading(false)})
    },150)
    return()=>{active=false;window.clearTimeout(timer)}
  },[native,normalizedQuery,trackIndex])
  const visibleResults = native&&!nativeError ? nativeResults : results
  const resultTotal = native&&!nativeError ? nativeTotal : results.length
  const loadMore = async ()=>{
    if(loadingMore || loading || !native || !normalizedQuery) return
    setLoadingMore(true)
    try{
      const page=await nativeTrackSearch(normalizedQuery,nativeResults.length,80)
      setNativeResults(old=>{
        const seen=new Set(old.map(t=>t.source.path))
        return old.concat(page.items.filter(t=>!seen.has(t.path))
          .map(t=>resolveNativeTrack(t,trackIndex)))
      })
      setNativeTotal(page.total)
    }finally{setLoadingMore(false)}
  }

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
            <strong>{loading ? 'Searching…' : `${resultTotal} ${resultTotal === 1 ? 'song' : 'songs'}`}</strong>
          </div>
          {visibleResults.length > 0 ? (
            <>
              <VirtualTrackList tracks={visibleResults} />
              {native && !nativeError && visibleResults.length < nativeTotal &&
                <button type="button" className="search-results__more"
                  disabled={loadingMore} onClick={()=>void loadMore()}>
                  {loadingMore?'Loading…':'Load more'}
                </button>}
            </>
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
