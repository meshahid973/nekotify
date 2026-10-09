import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowUp, GripVertical, ListMusic, Music2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import { Artwork } from '@/components/artwork/Artwork'
import { Button } from '@/components/primitives/Button'
import { IconButton } from '@/components/primitives/IconButton'
import { Slider } from '@/components/primitives/Slider'
import { TransportControls } from '@/components/player/TransportControls'
import { PulseHeart } from '@/components/reactbits/PulseHeart'
import { useCollectionsStore } from '@/features/collections/collections.store'
import { usePlaybackStore } from '@/features/playback/playback.store'
import { usePlayerPanelsStore } from '@/features/playback/player-panels.store'
import { formatPlaybackTime } from '@/features/playback/playback.utils'
import { useQueueStore } from '@/features/queue/queue.store'
import { notify } from '@/stores/toast.store'
import './PlayerPanels.css'

export function PlayerPanels({dockedQueue=false}:{dockedQueue?:boolean}) {
  const panel = usePlayerPanelsStore((state) => state.openPanel)
  const setPanel = usePlayerPanelsStore((state) => state.setPanel)
  const panelRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!panel) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = panelRef.current
    root?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setPanel(null)
      }
      if (event.key !== 'Tab' || !root) return
      const focusables = Array.from(root.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
      ))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root)) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [panel, setPanel])

  const overlayPanel = panel === 'queue' && dockedQueue ? null : panel
  return (
    <AnimatePresence>
      {overlayPanel ? <div className="player-panels" key="panels">
        <motion.button className="player-panels__scrim" type="button" tabIndex={-1}
          aria-label="Close player panel" onClick={() => setPanel(null)}
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          transition={{duration:reduced?0:.16}}/>
        {overlayPanel === 'queue'
          ? <QueuePanel refElement={panelRef} onClose={() => setPanel(null)} />
          : <NowPlayingPanel refElement={panelRef} onClose={() => setPanel(null)} />}
      </div> : null}
    </AnimatePresence>
  )
}

interface PanelProps {
  refElement: RefObject<HTMLElement | null>
  onClose: () => void
}

function NowPlayingPanel({ refElement, onClose }: PanelProps) {
  const track = usePlaybackStore((state) => state.track)
  const currentTime = usePlaybackStore((state) => state.currentTime)
  const duration = usePlaybackStore((state) => state.duration)
  const bufferedEnd = usePlaybackStore((state) => state.bufferedEnd)
  const seek = usePlaybackStore((state) => state.seek)
  const favorites = useCollectionsStore((state) => state.favorites)
  const toggleFavorite = useCollectionsStore((state) => state.toggleFavorite)
  const setPanel = usePlayerPanelsStore((state) => state.setPanel)
  const reduce = useReducedMotion()
  if (!track) return null
  const liked = favorites.includes(track.source.path)
  return (
    <motion.section
      initial={{opacity:0,scale:reduce?1:.975,y:reduce?0:12}}
      animate={{opacity:1,scale:1,y:0}}
      exit={{opacity:0,scale:.99}}
      transition={reduce?{duration:0}:{type:'spring',stiffness:390,damping:35}}
      className="now-playing-panel" role="dialog" aria-modal="true"
      aria-label="Now playing" tabIndex={-1} ref={refElement}>
      {track.artwork ? <img className="now-playing-panel__backdrop"
        src={track.artwork.uri} alt="" aria-hidden="true" /> : null}
      <div className="now-playing-panel__scrim" aria-hidden="true" />
      <div className="player-panels__heading">
        <span><Music2 size={17} aria-hidden="true" /> NOW PLAYING</span>
        <IconButton label="Close Now Playing" size="sm" onClick={onClose}><X size={20}/></IconButton>
      </div>
      <div className="now-playing-panel__body">
        <div className="now-playing-panel__details">
          <p className="eyebrow">THE SOUNDTRACK IS YOURS</p>
          <h2>{track.title}</h2>
          <p className="now-playing-panel__artist">{track.artist}</p>
          {track.album ? <p className="now-playing-panel__album">{track.album}</p> : null}
          <div className="now-playing-panel__control-block">
            <div className="now-playing-panel__slider">
              <Slider label="Seek" min={0} max={Math.max(duration,1)}
                step={0.1} value={Math.min(currentTime,Math.max(duration,1))}
                buffered={bufferedEnd} formatValue={formatPlaybackTime}
                disabled={duration <= 0} onValueChange={seek} />
              <div className="now-playing-panel__position">
                <span>{formatPlaybackTime(currentTime)}</span>
                <span>{formatPlaybackTime(duration)}</span>
              </div>
            </div>
            <TransportControls />
            <div className="now-playing-panel__additional">
              <IconButton label={liked ? 'Remove from liked songs' : 'Like this song'}
                aria-pressed={liked} size="md"
                onClick={() => void toggleFavorite(track.source.path)}>
                <PulseHeart liked={liked} size={19}/>
              </IconButton>
              <Button variant="secondary" size="sm" onClick={() => setPanel('queue')}>
                <ListMusic size={17}/> View queue
              </Button>
            </div>
          </div>
        </div>
        <div className="now-playing-panel__visual">
          <Artwork size="lg" src={track.artwork?.uri}
            alt={track.artwork?.alt ?? 'Current album artwork'} />
        </div>
      </div>
    </motion.section>
  )
}

export function DockedQueue() {
  const close=usePlayerPanelsStore((s)=>s.setPanel)
  const ref=useRef<HTMLElement>(null)
  return <QueuePanel refElement={ref} docked onClose={()=>close(null)}/>
}

function QueuePanel({ refElement, onClose, docked=false }: PanelProps & {docked?:boolean}) {
  const items = useQueueStore((state) => state.items)
  const currentIndex = useQueueStore((state) => state.currentIndex)
  const select = useQueueStore((state) => state.select)
  const move = useQueueStore((state) => state.move)
  const remove = useQueueStore((state) => state.remove)
  const [dragging, setDragging] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const loadTrack = usePlaybackStore((state) => state.loadTrack)
  const play = usePlaybackStore((state) => state.play)
  const playAt = (index: number) => {
    const chosen = select(index)
    if (!chosen) return
    loadTrack(chosen)
    void play().catch(() => undefined)
  }

  return (
    <motion.section
      initial={{opacity:0,x:reduce||docked?0:35}} animate={{opacity:1,x:0}}
      exit={{opacity:0,x:reduce||docked?0:35}}
      transition={reduce?{duration:0}:{type:'spring',stiffness:420,damping:40}}
      className={docked ? 'queue-panel queue-panel--docked' : 'queue-panel'}
      role={docked ? 'region' : 'dialog'} aria-modal={docked ? undefined : true}
      aria-label="Playback queue" tabIndex={-1} ref={refElement}>
      <div className="player-panels__heading">
        <div><p className="eyebrow">UP NEXT</p>
          <h2>Play queue <span>{items.length}</span></h2></div>
        <IconButton label="Close queue" size="sm" onClick={onClose}><X size={20}/></IconButton>
      </div>
      <div className="queue-panel__list">
        {items.length === 0 ? (
          <div className="queue-panel__empty">
            <ListMusic size={29}/><strong>Your queue is empty</strong>
            <span>Play a song from your library to begin.</span>
          </div>
        ) : items.map((track, index) => (
          <motion.div layout={!reduce} transition={{layout:{type:'spring',stiffness:410,damping:38}}}
            key={track.id + ':' + index}>
            <div className="queue-panel__row"
              data-active={currentIndex === index} data-dragging={dragging === index}
              draggable
            onDragStart={(event) => {
              setDragging(index)
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', String(index))
            }}
            onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }}
            onDrop={(event) => {
              event.preventDefault()
              const from = Number(event.dataTransfer.getData('text/plain'))
              if (Number.isInteger(from) && from >= 0 && from < items.length) move(from,index)
              setDragging(null)
            }}
            onDragEnd={() => setDragging(null)}>
            <GripVertical className="queue-panel__grab" size={16} aria-hidden="true"/>
            <button className="queue-panel__track" type="button"
              aria-label={'Play ' + track.title} onClick={() => playAt(index)}>
              <Artwork size="sm" src={track.artwork?.uri} alt=""/>
              <span><strong>{track.title}</strong><small>{track.artist}</small></span>
            </button>
            <div className="queue-panel__actions">
              <IconButton label={'Move ' + track.title + ' up'} size="sm"
                disabled={index===0} onClick={() => move(index,index-1)}><ArrowUp size={14}/></IconButton>
              <IconButton label={'Move ' + track.title + ' down'} size="sm"
                disabled={index===items.length-1}
                onClick={() => move(index,index+1)}><ArrowDown size={14}/></IconButton>
              <IconButton label={'Remove ' + track.title} size="sm"
                disabled={index===currentIndex}
                onClick={() => {remove(index);notify('Removed from queue','info')}}><X size={14}/></IconButton>
            </div>
            </div>
          </motion.div>
        ))}
      </div>
      {items.length > 0 ? <footer className="queue-panel__footer">
        Drag to reorder, or use the arrow buttons.
      </footer> : null}
    </motion.section>
  )
}
