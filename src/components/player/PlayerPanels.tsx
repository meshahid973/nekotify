import { ArrowDown, ArrowUp, ListMusic, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import { Artwork } from '@/components/artwork/Artwork'
import { IconButton } from '@/components/primitives/IconButton'
import { Slider } from '@/components/primitives/Slider'
import { TransportControls } from '@/components/player/TransportControls'
import { usePlaybackStore } from '@/features/playback/playback.store'
import { usePlayerPanelsStore } from '@/features/playback/player-panels.store'
import { formatPlaybackTime } from '@/features/playback/playback.utils'
import { useQueueStore } from '@/features/queue/queue.store'

import './PlayerPanels.css'

export function PlayerPanels() {
  const panel = usePlayerPanelsStore((state) => state.openPanel)
  const setPanel = usePlayerPanelsStore((state) => state.setPanel)
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!panel) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setPanel(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [panel, setPanel])

  if (!panel) return null

  return (
    <div className="player-panels">
      <button
        className="player-panels__scrim"
        type="button"
        aria-label="Close player panel"
        onClick={() => setPanel(null)}
      />
      {panel === 'queue' ? (
        <QueuePanel refElement={panelRef} onClose={() => setPanel(null)} />
      ) : (
        <NowPlayingPanel refElement={panelRef} onClose={() => setPanel(null)} />
      )}
    </div>
  )
}

function NowPlayingPanel({
  refElement, onClose,
}: { refElement: RefObject<HTMLElement | null>; onClose: () => void }) {
  const track = usePlaybackStore((state) => state.track)
  const currentTime = usePlaybackStore((state) => state.currentTime)
  const duration = usePlaybackStore((state) => state.duration)
  const seek = usePlaybackStore((state) => state.seek)
  if (!track) return null

  return (
    <section className="now-playing-panel" role="dialog" aria-modal="true" aria-label="Now playing" tabIndex={-1} ref={refElement}>
      <div className="player-panels__heading">
        <span>Now playing</span>
        <IconButton label="Close Now Playing" size="sm" onClick={onClose}><X size={18}/></IconButton>
      </div>
      <div className="now-playing-panel__body">
        <Artwork size="lg" src={track.artwork?.uri} alt={track.artwork?.alt ?? ''}/>
        <h2>{track.title}</h2>
        <p>{track.artist}{track.album ? ' · ' + track.album : ''}</p>
        <TransportControls />
        <Slider className="now-playing-panel__seek" label="Seek" min={0}
          max={Math.max(duration, 1)} step={0.1}
          value={Math.min(currentTime, Math.max(duration, 1))}
          disabled={duration <= 0} onValueChange={seek}/>
        <span className="now-playing-panel__position">{formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}</span>
      </div>
    </section>
  )
}

function QueuePanel({
  refElement, onClose,
}: { refElement: RefObject<HTMLElement | null>; onClose: () => void }) {
  const items = useQueueStore((state) => state.items)
  const index = useQueueStore((state) => state.currentIndex)
  const select = useQueueStore((state) => state.select)
  const move = useQueueStore((state) => state.move)
  const [dragging, setDragging] = useState<number | null>(null)
  const remove = useQueueStore((state) => state.remove)
  const loadTrack = usePlaybackStore((state) => state.loadTrack)
  const play = usePlaybackStore((state) => state.play)

  const playAt = (itemIndex: number) => {
    const selected = select(itemIndex)
    if (!selected) return
    loadTrack(selected)
    void play().catch(() => undefined)
  }

  return (
    <section className="queue-panel" role="dialog" aria-modal="true" aria-label="Playback queue" tabIndex={-1} ref={refElement}>
      <div className="player-panels__heading">
        <span><ListMusic size={17} aria-hidden="true"/> Queue</span>
        <IconButton label="Close queue" size="sm" onClick={onClose}><X size={18}/></IconButton>
      </div>
      <div className="queue-panel__list">
        {items.length === 0 ? <p className="queue-panel__empty">Queue is empty</p> :
          items.map((track, itemIndex) => (
            <div className="queue-panel__row" data-active={index === itemIndex}
              data-dragging={dragging === itemIndex}
              key={track.id + ':' + itemIndex}
              draggable
              onDragStart={(event) => {
                setDragging(itemIndex)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', String(itemIndex))
              }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
              onDrop={(event) => {
                event.preventDefault()
                const from = Number(event.dataTransfer.getData('text/plain'))
                if (Number.isInteger(from) && from >= 0 && from < items.length) move(from, itemIndex)
                setDragging(null)
              }}
              onDragEnd={() => setDragging(null)}
            >
              <button type="button" className="queue-panel__track" onClick={() => playAt(itemIndex)}>
                <Artwork size="sm" src={track.artwork?.uri} alt=""/>
                <span><strong>{track.title}</strong><small>{track.artist}</small></span>
              </button>
              <div className="queue-panel__actions">
                <IconButton label={'Move ' + track.title + ' up'} size="sm" disabled={itemIndex === 0} onClick={() => move(itemIndex, itemIndex - 1)}><ArrowUp size={14}/></IconButton>
                <IconButton label={'Move ' + track.title + ' down'} size="sm" disabled={itemIndex === items.length - 1} onClick={() => move(itemIndex, itemIndex + 1)}><ArrowDown size={14}/></IconButton>
                <IconButton label={'Remove ' + track.title} size="sm" disabled={itemIndex === index} onClick={() => remove(itemIndex)}><X size={14}/></IconButton>
              </div>
            </div>
          ))}
      </div>
    </section>
  )
}
