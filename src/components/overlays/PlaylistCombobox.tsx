import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Playlist } from '@/features/collections/collections.store'
import './Overlays.css'

/** Searchable keyboard-selectable combobox inspired by beUI.
 * Overlay is portaled so virtualized song rows cannot clip the menu. */
export function PlaylistCombobox({label,playlists,onChoose}:{
  label:string;playlists:Playlist[];onChoose:(playlist:Playlist)=>void
}) {
  const [open,setOpen]=useState(false)
  const [query,setQuery]=useState('')
  const [index,setIndex]=useState(0)
  const [rect,setRect]=useState<DOMRect|null>(null)
  const button=useRef<HTMLButtonElement>(null)
  const input=useRef<HTMLInputElement>(null)
  const root=useRef<HTMLDivElement>(null)
  const reduce=useReducedMotion()
  const filtered=playlists.filter(p=>p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  useEffect(()=>{
    if(!open)return
    input.current?.focus()
    const onDocument=(e:PointerEvent)=>{
      if(root.current?.contains(e.target as Node)||button.current?.contains(e.target as Node))return
      setOpen(false)
    }
    const close=()=>setOpen(false)
    window.addEventListener('pointerdown',onDocument,true)
    window.addEventListener('scroll',close,true)
    window.addEventListener('resize',close)
    return()=>{
      window.removeEventListener('pointerdown',onDocument,true)
      window.removeEventListener('scroll',close,true)
      window.removeEventListener('resize',close)
    }
  },[open])
  const choose=(p:Playlist)=>{onChoose(p);setOpen(false);setQuery('');button.current?.focus()}
  return <>
    <button ref={button} type="button" className="nk-combo__trigger"
      aria-label={label} aria-expanded={open} aria-haspopup="listbox"
      onClick={()=>{setRect(button.current?.getBoundingClientRect()??null);setOpen(v=>!v);setIndex(0)}}>
      Playlist <ChevronDown size={12}/>
    </button>
    {createPortal(<AnimatePresence>{open && rect?<motion.div ref={root}
      className="nk-combo" role="dialog" aria-label={label}
      style={{left:Math.min(rect.left,window.innerWidth-220),top:Math.min(rect.bottom+4,window.innerHeight-220)}}
      initial={{opacity:0,scale:reduce?1:.96,y:reduce?0:-5}}
      animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.98}}
      transition={reduce?{duration:0}:{type:'spring',stiffness:480,damping:36}}>
      <div className="nk-combo__search"><Search size={13}/>
        <input ref={input} role="combobox" aria-expanded={true}
          aria-label={'Search playlists for '+label} aria-controls="nk-playlist-options"
          aria-activedescendant={filtered.length?'nk-playlist-'+filtered[Math.min(index,filtered.length-1)].id:undefined}
          placeholder="Find playlist..." value={query}
          onChange={e=>{setQuery(e.currentTarget.value);setIndex(0)}}
          onKeyDown={e=>{
            if(e.key==='Escape'){e.preventDefault();setOpen(false);button.current?.focus()}
            if(e.key==='ArrowDown'){e.preventDefault();setIndex(v=>Math.min(filtered.length-1,v+1))}
            if(e.key==='ArrowUp'){e.preventDefault();setIndex(v=>Math.max(0,v-1))}
            if(e.key==='Enter'&&filtered.length){e.preventDefault();choose(filtered[Math.min(index,filtered.length-1)])}
          }}/>
      </div>
      <div className="nk-combo__list" id="nk-playlist-options" role="listbox">
        {filtered.length===0?<p>No playlists</p>:filtered.map((p,i)=><button
          type="button" role="option" aria-selected={index===i}
          id={'nk-playlist-'+p.id} key={p.id}
          onMouseEnter={()=>setIndex(i)} onClick={()=>choose(p)}>
          <span>{p.name}</span>{index===i?<Check size={14}/>:null}
        </button>)}
      </div>
    </motion.div>:null}</AnimatePresence>,document.body)}
  </>
}
