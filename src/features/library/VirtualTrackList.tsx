import { useVirtualizer } from '@tanstack/react-virtual'
import { useLayoutEffect, useRef, useState } from 'react'

import { playLibraryTrack } from '@/features/library/playLibraryTrack'
import { TrackRow } from '@/features/library/TrackRow'
import { usePlaybackStore } from '@/features/playback/playback.store'
import type { Track } from '@/types/media'

import './VirtualTrackList.css'

function getScrollElement() {
  return document.querySelector<HTMLElement>('.app-shell__content')
}

export function VirtualTrackList({ tracks }: { tracks: Track[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const currentId = usePlaybackStore((state) => state.track?.id)
  const playbackStatus = usePlaybackStore((state) => state.status)

  useLayoutEffect(() => {
    const update = () => {
      const scroll = getScrollElement()
      const container = containerRef.current
      if (!scroll || !container) return
      const offset = container.getBoundingClientRect().top -
        scroll.getBoundingClientRect().top + scroll.scrollTop
      setScrollMargin(offset)
    }
    update()
    const observer = new ResizeObserver(update)
    const scroll = getScrollElement()
    if (scroll) observer.observe(scroll)
    window.addEventListener('resize', update)
    return () => { observer.disconnect(); window.removeEventListener('resize', update) }
  }, [tracks.length])

  // TanStack Virtual's mutable measurement API is intentionally not memoized by React Compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement,
    estimateSize: () => 66,
    overscan: 8,
    scrollMargin,
    getItemKey: (index) => tracks[index]?.id ?? index,
  })

  return (
    <div
      ref={containerRef}
      className="virtual-track-list"
      style={{ height: Math.max(0, virtualizer.getTotalSize() - scrollMargin) }}
    >
      {virtualizer.getVirtualItems().map((item) => {
        const track = tracks[item.index]
        if (!track) return null
        return (
          <div
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
            className="virtual-track-list__row"
            style={{ transform: `translateY(${item.start - scrollMargin}px)` }}
          >
            <TrackRow
              track={track}
              active={currentId === track.id}
              playing={currentId === track.id &&
                (playbackStatus === 'playing' || playbackStatus === 'loading')}
              onPlay={() => void playLibraryTrack(track, tracks)}
            />
          </div>
        )
      })}
    </div>
  )
}
