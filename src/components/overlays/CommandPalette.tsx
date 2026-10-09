import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Heart, Library, ListMusic, Moon, Music2, Search, Settings } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyEvent } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { playLibraryTrack } from '@/features/library/playLibraryTrack'
import { useLibraryStore } from '@/features/library/library.store'
import { usePlaybackStore } from '@/features/playback/playback.store'
import { useQueueStore } from '@/features/queue/queue.store'
import { useCollectionsStore } from '@/features/collections/collections.store'
import { useUiStore } from '@/stores/ui.store'
import './Overlays.css'

// Adapted from beUI's command-palette interaction pattern.
// Items are real local-library actions; no network search or mock commands.
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const tracks = useLibraryStore((s) => s.tracks)
  const current = usePlaybackStore((s) => s.track)
  const theme = useUiStore((s) => s.theme)
  const systemReduced = useReducedMotion()
  const preference = useUiStore((s) => s.motionPreference)
  const reduced = Boolean(systemReduced) || preference === 'reduced'
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [selected, setSelected] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    input.current?.focus()
    return () => lastFocus.current?.focus()
  }, [open])

  const commands = useMemo(() => {
    const navigateTo = (path: string) => () => navigate(path)
    const navigation = [
      { id:'home', label:'Home', keywords:'dashboard', icon: Music2, action:navigateTo('/') },
      { id:'library', label:'Library', keywords:'songs tracks', icon:Library, action:navigateTo('/library') },
      { id:'search', label:'Search page', keywords:'search albums artists', icon:Search, action:navigateTo('/search') },
      { id:'likes', label:'Liked songs', keywords:'favorite', icon:Heart, action:navigateTo('/library?view=favorites') },
      { id:'playlists', label:'Playlists', keywords:'collections', icon:ListMusic, action:navigateTo('/library?view=playlists') },
      { id:'settings', label:'Settings', keywords:'preferences', icon:Settings, action:navigateTo('/settings') },
      { id:'theme', label:theme==='oled'?'Use Ambience theme':'Use OLED theme', keywords:'theme', icon:Moon, action:()=>useUiStore.getState().setTheme(theme==='oled'?'ambience':'oled') },
    ]
    const actions = current ? [
      { id:'next', label:'Play current track next', keywords:'queue', icon:ListMusic, action:()=>useQueueStore.getState().playNext(current) },
      { id:'favorite', label:'Toggle favorite', keywords:'like heart', icon:Heart, action:()=>{void useCollectionsStore.getState().toggleFavorite(current.source.path)} },
    ] : []
    return [...navigation,...actions]
  }, [current,theme,navigate])

  const filtered = useMemo(() => {
    const words = deferredQuery.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
    const matches = (value:string) => words.every((word)=>value.toLocaleLowerCase().includes(word))
    const result = commands.filter(c=>matches(c.label+' '+c.keywords))
    // Search every imported song, but stop after 50 matches; never truncate the
    // searchable library to an arbitrary first-N subset.
    for (const track of tracks) {
      if (result.length>=50) break
      if (words.length && !matches([track.title,track.artist,track.album].filter(Boolean).join(' '))) continue
      result.push({
        id:'track:'+track.id,label:track.title,
        keywords:[track.artist,track.album].filter(Boolean).join(' '),
        icon:Music2,action:()=>{void playLibraryTrack(track,tracks)},
      })
      if(!words.length && result.length>=12)break
    }
    return result.slice(0,50)
  },[commands,tracks,deferredQuery])
  const safeIndex = Math.min(selected,Math.max(0,filtered.length-1))
  const choose = (index:number) => {
    const item = filtered[index]
    if (!item) return
    item.action()
    onClose()
  }
  const onKeyDown = (event: ReactKeyEvent<HTMLDivElement>) => {
    if (event.key==='Escape') {event.preventDefault();onClose();return}
    if (event.key==='ArrowDown') {event.preventDefault();setSelected((v)=>Math.min(filtered.length-1,v+1));return}
    if (event.key==='ArrowUp') {event.preventDefault();setSelected((v)=>Math.max(0,v-1));return}
    if (event.key==='Enter') {event.preventDefault();choose(safeIndex);return}
    if (event.key==='Tab' && panel.current) {
      // Palette has one interactive field and optional command buttons.
      const els=Array.from(panel.current.querySelectorAll<HTMLElement>('input, button:not(:disabled)'))
      const index=els.indexOf(document.activeElement as HTMLElement)
      if ((event.shiftKey && index===0)||(!event.shiftKey && index===els.length-1)) {
        event.preventDefault();(event.shiftKey?els[els.length-1]:els[0])?.focus()
      }
    }
  }
  return createPortal(
    <AnimatePresence>
      {open ? <div className="nk-overlay" onKeyDown={onKeyDown}>
        <motion.button className="nk-overlay__shade" type="button"
          aria-label="Close command search" onClick={onClose}
          initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} />
        <motion.div ref={panel} role="dialog" aria-modal="true" aria-label="Search and commands"
          className="nk-command" initial={{opacity:0,y:reduced?0:-9,scale:reduced?1:.97}}
          animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:reduced?0:-7,scale:reduced?1:.98}}
          transition={reduced?{duration:.09}:{type:'spring',stiffness:560,damping:40}}>
          <div className="nk-command__input"><Search size={18}/>
            <input ref={input} aria-label="Search commands and songs"
              role="combobox" aria-expanded="true" aria-controls="nk-command-results"
              aria-activedescendant={filtered.length?'nk-command-item-'+safeIndex:undefined}
              autoComplete="off" value={query} placeholder="Search songs and commands..."
              onChange={e=>{setQuery(e.currentTarget.value);setSelected(0)}}/>
            <kbd>Esc</kbd></div>
          <div className="nk-command__results" role="listbox" id="nk-command-results"
            aria-label="Search results">
            {!filtered.length ? <p className="nk-command__empty">No results</p> :
              filtered.map((item,index)=><button key={item.id} type="button" role="option"
                id={'nk-command-item-'+index} aria-selected={index===safeIndex}
                className="nk-command__item" onMouseEnter={()=>setSelected(index)}
                onClick={()=>choose(index)}>
                {index===safeIndex ? <motion.span layoutId="nk-command-active"
                  className="nk-command__active"
                  transition={reduced?{duration:0}:{type:'spring',stiffness:480,damping:38}}/> : null}
                <item.icon size={16} aria-hidden="true"/>
                <span>{item.label}</span><small>{item.id.startsWith('track:')?'Song':''}</small>
              </button>)}
          </div>
        </motion.div>
      </div>:null}
    </AnimatePresence>,document.body)
}
