import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { IconButton } from '@/components/primitives/IconButton'
import { useCoverPickerStore } from '@/features/library/cover-picker.store'
import { useLibraryStore } from '@/features/library/library.store'

import './CoverPicker.css'

export function CoverPicker() {
  const trackPath = useCoverPickerStore((state) => state.trackPath)
  const close = useCoverPickerStore((state) => state.close)
  const pool = useLibraryStore((state) => state.artworkPool)
  const tracks = useLibraryStore((state) => state.tracks)
  const setArtwork = useLibraryStore((state) => state.setArtwork)
  const status = useLibraryStore((state) => state.status)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLElement>(null)
  const track = tracks.find((item) => item.source.path === trackPath)

  useEffect(() => {
    if (!trackPath) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    ref.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [close, trackPath])

  if (!trackPath) return null

  const matches = pool.filter((art) =>
    (art.alt ?? '').toLowerCase().includes(query.trim().toLowerCase())
  ).slice(0, 60)

  const select = (path: string | null) => {
    void setArtwork(trackPath, path)
    close()
    setQuery('')
  }

  return (
    <div className="cover-picker-overlay">
      <button type="button" aria-label="Close artwork picker"
        className="cover-picker-overlay__backdrop" onClick={close}/>
      <section className="cover-picker" role="dialog" aria-modal="true"
        aria-label="Choose artwork" tabIndex={-1} ref={ref}>
        <header>
          <div><strong>Choose artwork</strong><small>{track?.title ?? ''}</small></div>
          <IconButton label="Close" size="sm" onClick={close}><X size={17}/></IconButton>
        </header>
        <label className="cover-picker__search">
          <Search size={16}/>
          <input value={query} onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Filter imported images" aria-label="Search artwork" />
        </label>
        <div className="cover-picker__grid">
          <button type="button" className="cover-picker__reset"
            disabled={status === 'loading'} onClick={() => select(null)}>
            Use original
          </button>
          {matches.map((art) => (
            <button type="button" key={art.path} disabled={status === 'loading'}
              title={art.alt ?? ''} onClick={() => select(art.path ?? null)}>
              <img src={art.uri} alt={art.alt ?? 'Artwork'} loading="lazy"/>
            </button>
          ))}
        </div>
        {!pool.length ? <p>Import an artwork folder in Settings first.</p> : null}
      </section>
    </div>
  )
}
