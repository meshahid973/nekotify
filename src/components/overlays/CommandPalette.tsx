import { motion, useReducedMotion } from 'motion/react'
import { isTauri } from '@tauri-apps/api/core'
import { Dialog } from '@base-ui/react/dialog'
import { Heart, Library, ListMusic, Moon, Music2, Search, Settings } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { playLibraryTrack } from '@/features/library/playLibraryTrack'
import { useLibraryStore } from '@/features/library/library.store'
import { nativeTrackSearch, resolveNativeTrack } from '@/features/library/nativeQueries'
import type { Track } from '@/types/media'
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
  const [indexedMatches,setIndexedMatches] = useState<Track[]>([])
  const [indexedFailed,setIndexedFailed] = useState(false)
  const paths = useMemo(()=>new Map(tracks.map(t=>[t.source.path,t])),[tracks])
  const [selected, setSelected] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if(open) input.current?.focus() },[open])

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

  useEffect(()=>{
    if(!open || !isTauri() || !deferredQuery.trim()) return
    let current = true
    const timer = window.setTimeout(()=>{
      void nativeTrackSearch(deferredQuery.trim(),0,40).then(page=>{
        if(!current)return
        setIndexedMatches(page.items.map(t=>resolveNativeTrack(t,paths)))
        setIndexedFailed(page.total === 0)
      }).catch(()=>{if(current)setIndexedFailed(true)})
    },130)
    return()=>{current=false;window.clearTimeout(timer)}
  },[open,deferredQuery,paths])

  const filtered = useMemo(() => {
    const words = deferredQuery.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
    const matches = (value:string) => words.every((word)=>value.toLocaleLowerCase().includes(word))
    const result = commands.filter(c=>matches(c.label+' '+c.keywords))
    // Both search surfaces share the Rust index in the desktop application.
    // Browser previews keep the existing in-memory fallback.
    const candidates = isTauri() && words.length && !indexedFailed
      ? indexedMatches : tracks
    for (const track of candidates) {
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
  },[commands,tracks,indexedMatches,indexedFailed,deferredQuery])
  const safeIndex = Math.min(selected,Math.max(0,filtered.length-1))
  const choose = (index:number) => {
    const item = filtered[index]
    if (!item) return
    item.action()
    onClose()
  }
  const onKeyDown = (event: ReactKeyEvent<HTMLDivElement>) => {
    if (event.key==='ArrowDown') {event.preventDefault();setSelected((v)=>Math.min(filtered.length-1,v+1));return}
    if (event.key==='ArrowUp') {event.preventDefault();setSelected((v)=>Math.max(0,v-1));return}
    if (event.key==='Enter') {event.preventDefault();choose(safeIndex);return}

  }
  return <Dialog.Root open={open} onOpenChange={(next)=>{if(!next)onClose()}}>
    <Dialog.Portal>
      <div className="nk-overlay" onKeyDown={onKeyDown}>
        <Dialog.Backdrop className="nk-overlay__shade"/>
        <Dialog.Popup className="nk-command">
          <Dialog.Title className="nk-command__accessible-title">Search and commands</Dialog.Title>
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
        </Dialog.Popup>
      </div>
    </Dialog.Portal>
  </Dialog.Root>
}
