import { Disc3, Library, ListMusic, Mic2, Music } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Surface } from '@/components/primitives/Surface'

import './LibraryPage.css'

type LibraryTab = 'songs' | 'albums' | 'artists' | 'playlists'

const tabs: Array<{
  id: LibraryTab
  label: string
  icon: typeof Music
  emptyTitle: string
  emptyCopy: string
}> = [
  {
    id: 'songs',
    label: 'Songs',
    icon: Music,
    emptyTitle: 'No songs indexed yet',
    emptyCopy: 'Local folder importing and metadata indexing arrive in Phase 2.',
  },
  {
    id: 'albums',
    label: 'Albums',
    icon: Disc3,
    emptyTitle: 'No albums yet',
    emptyCopy: 'Albums will be assembled from your local metadata in Phase 2.',
  },
  {
    id: 'artists',
    label: 'Artists',
    icon: Mic2,
    emptyTitle: 'No artists yet',
    emptyCopy: 'Artists will appear here after Nekotify indexes your library.',
  },
  {
    id: 'playlists',
    label: 'Playlists',
    icon: ListMusic,
    emptyTitle: 'No playlists yet',
    emptyCopy: 'Playlist creation begins after the local library engine is in place.',
  },
]

export function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('songs')
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]
  const ActiveIcon = active.icon

  return (
    <div className="page library-page">
      <PageHeader
        eyebrow="Your collection"
        title="Library"
        description="One fast, local view for everything you choose to keep on this device."
      />

      <div className="library-tabs" role="tablist" aria-label="Library views">
        {tabs.map((tab) => {
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={
                activeTab === tab.id
                  ? 'library-tab library-tab--active'
                  : 'library-tab'
              }
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} aria-hidden="true" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <Surface className="library-empty" tone="subtle" role="tabpanel">
        <div className="library-empty__art">
          <Library size={46} strokeWidth={1.35} aria-hidden="true" />
          <span className="library-empty__badge" aria-hidden="true">
            <ActiveIcon size={15} />
          </span>
        </div>
        <h2>{active.emptyTitle}</h2>
        <p>{active.emptyCopy}</p>
      </Surface>
    </div>
  )
}
