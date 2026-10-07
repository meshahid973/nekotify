import { Disc3, LayoutGrid, ListMusic, Mic2, Music } from 'lucide-react'
import { useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/primitives/Button'
import { useUiStore } from '@/stores/ui.store'

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
    emptyTitle: 'No songs yet',
    emptyCopy: 'Choose local folders in Phase 2 and your tracks will appear here.',
  },
  {
    id: 'albums',
    label: 'Albums',
    icon: Disc3,
    emptyTitle: 'No albums yet',
    emptyCopy: 'Albums will be grouped from your local metadata.',
  },
  {
    id: 'artists',
    label: 'Artists',
    icon: Mic2,
    emptyTitle: 'No artists yet',
    emptyCopy: 'Artists will appear after the first library scan.',
  },
  {
    id: 'playlists',
    label: 'Playlists',
    icon: ListMusic,
    emptyTitle: 'No playlists yet',
    emptyCopy: 'Playlist tools arrive after the local library engine.',
  },
]

export function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('songs')
  const density = useUiStore((state) => state.density)
  const setDensity = useUiStore((state) => state.setDensity)
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]
  const ActiveIcon = active.icon

  return (
    <div className="page library-page">
      <PageHeader
        eyebrow="Library"
        title="quick library"
        description="Artwork first, compact, and built to stay readable when your collection gets large."
        actions={
          <div className="library-page__summary">
            <span>0 songs</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setDensity(density === 'compact' ? 'comfortable' : 'compact')
              }
            >
              <LayoutGrid size={14} aria-hidden="true" />
              {density === 'compact' ? 'comfortable' : 'compact'}
            </Button>
          </div>
        }
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
              <Icon size={14} aria-hidden="true" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="library-canvas" role="tabpanel">
        <div className="library-canvas__empty-icon" aria-hidden="true">
          <ActiveIcon size={24} strokeWidth={1.5} />
        </div>
        <strong>{active.emptyTitle}</strong>
        <p>{active.emptyCopy}</p>
      </div>
    </div>
  )
}
