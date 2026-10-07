import { Search } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'

import './SearchPage.css'

export function SearchPage() {
  return (
    <div className="page search-page">
      <PageHeader
        eyebrow="Discovery"
        title="find your music"
        description="Search songs, albums, and artists without sending your library anywhere."
        actions={<span className="key-hint">Ctrl K</span>}
      />

      <label className="search-field">
        <Search size={17} aria-hidden="true" />
        <input
          id="nekotify-search-input"
          type="search"
          placeholder="Search songs, albums, or artists"
          aria-label="Search songs, albums, or artists"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="search-field__scope">Local</span>
      </label>

      <section className="search-results-shell" aria-labelledby="search-results-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Results</p>
            <h2 className="section-heading__title" id="search-results-title">
              your library
            </h2>
          </div>
        </div>

        <div className="search-empty">
          <Search size={17} aria-hidden="true" />
          <span>Search becomes available as soon as a local music folder is connected.</span>
        </div>
      </section>
    </div>
  )
}
