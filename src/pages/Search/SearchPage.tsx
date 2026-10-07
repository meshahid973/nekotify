import { Search } from 'lucide-react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Surface } from '@/components/primitives/Surface'

import './SearchPage.css'

export function SearchPage() {
  return (
    <div className="page search-page">
      <PageHeader
        eyebrow="Find your sound"
        title="Search"
        description="Search becomes instant and fully local when the library index lands in Phase 2."
        actions={<span className="key-hint">Ctrl K</span>}
      />

      <label className="search-field">
        <Search size={19} aria-hidden="true" />
        <input
          id="nekotify-search-input"
          type="search"
          placeholder="Search your library"
          aria-label="Search your library"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="search-field__scope">Local</span>
      </label>

      <Surface className="search-empty" tone="subtle">
        <div className="search-empty__icon">
          <Search size={27} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <h2>Ready for the local index</h2>
        <p>
          The search interface is in place. Phase 2 connects it to SQLite-backed
          songs, albums, and artists without sending your library anywhere.
        </p>
      </Surface>
    </div>
  )
}
