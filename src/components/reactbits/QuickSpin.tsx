import { RefreshCw, Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import OptionWheel from '@/components/reactbits/OptionWheel'
import { Button } from '@/components/primitives/Button'
import { playLibraryTrack } from '@/features/library/playLibraryTrack'
import { useLibraryStore } from '@/features/library/library.store'
import { useUiStore } from '@/stores/ui.store'
import './QuickSpin.css'

/** Optional React Bits wheel for picking a song; changing selection never auto-plays. */
export function QuickSpin() {
  const tracks = useLibraryStore((s)=>s.tracks)
  const preference = useUiStore((s)=>s.motionPreference)
  const systemReduced=useReducedMotion()
  const reduce=Boolean(systemReduced)||preference==='reduced'
  const [offset,setOffset]=useState(0)
  const [index,setIndex]=useState(0)
  const picks=useMemo(()=>{
    if(tracks.length===0)return []
    return Array.from({length:Math.min(8,tracks.length)},(_,i)=>tracks[(offset+i)%tracks.length])
  },[offset,tracks])
  if(!picks.length)return null
  const play=()=>{const track=picks[index];if(track)void playLibraryTrack(track,tracks)}
  return <section className="nk-spin" aria-label="Quick Spin music picker">
    <div className="section-heading">
      <h2 className="section-heading__title">Quick Spin</h2>
      <button type="button" className="nk-spin__refresh"
        onClick={()=>{setOffset(v=>(v+Math.max(1,Math.round(tracks.length/7)))%tracks.length);setIndex(0)}}>
        <RefreshCw size={15}/> New picks
      </button>
    </div>
    <div className="nk-spin__body">
      {reduce ?
        <select aria-label="Choose a track" value={index}
          onChange={e=>setIndex(Number(e.currentTarget.value))}>
          {picks.map((track,i)=><option key={track.id} value={i}>{track.title}</option>)}
        </select>
        : <div className="nk-spin__wheel">
          <OptionWheel key={offset} items={picks.map(track=>track.title)} defaultSelected={0}
            onChange={(i)=>setIndex(i)} textColor="#777" activeColor="#fff"
            fontSize={1.05} spacing={2.25} curve={.45} blur={0} fade={.22}
            tilt={5} inset={15} smoothing={155} loop={picks.length>1}
            draggable soundUrl=""/>
        </div>}
      <div className="nk-spin__action">
        <strong title={picks[index]?.title}>{picks[index]?.title}</strong>
        <small>{picks[index]?.artist}</small>
        <Button onClick={play} size="sm"><Play size={15} fill="currentColor"/> Play selection</Button>
      </div>
    </div>
  </section>
}
