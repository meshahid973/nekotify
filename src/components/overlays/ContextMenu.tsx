import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './Overlays.css'
export interface MenuAction { id:string; label:string; icon?:ReactNode; onClick:()=>void; disabled?:boolean }
export function ContextMenu({position,items,onClose}:{
  position:{x:number;y:number}|null;items:MenuAction[];onClose:()=>void
}) {
  const ref=useRef<HTMLDivElement>(null)
  const reduced=useReducedMotion()
  useEffect(()=>{
    if(!position)return
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();onClose()}}
    const out=(e:PointerEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))onClose()}
    window.addEventListener('keydown',close)
    window.addEventListener('pointerdown',out,true)
    return()=>{window.removeEventListener('keydown',close);window.removeEventListener('pointerdown',out,true)}
  },[position,onClose])
  const x=position?Math.min(position.x,window.innerWidth-232):0
  const y=position?Math.min(position.y,window.innerHeight-Math.min(items.length*42+20,420)):0
  return createPortal(<AnimatePresence>
    {position?<motion.div ref={ref} role="menu" className="nk-context"
      style={{left:Math.max(8,x),top:Math.max(8,y)}}
      initial={{opacity:0,scale:reduced?1:.95,y:reduced?0:4}}
      animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.97}}
      transition={reduced?{duration:0}:{type:'spring',stiffness:520,damping:37}}>
      {items.map(item=><button role="menuitem" key={item.id} type="button"
        disabled={item.disabled} onClick={()=>{item.onClick();onClose()}}>
        {item.icon}<span>{item.label}</span>
      </button>)}
    </motion.div>:null}
  </AnimatePresence>,document.body)
}
