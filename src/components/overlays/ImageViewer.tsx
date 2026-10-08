import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './ImageViewer.css'
export interface ViewableImage { path?: string; src:string; alt:string }
export function ImageViewer({images,index,onIndex,onClose,onChoose}:{
  images:ViewableImage[];index:number|null;onIndex:(index:number)=>void
  onClose:()=>void;onChoose?:(path:string|null)=>void
}) {
  const reduced=useReducedMotion()
  const closeRef=useRef<HTMLButtonElement>(null)
  useEffect(()=>{
    if(index===null)return
    const prev=document.activeElement instanceof HTMLElement?document.activeElement:null
    closeRef.current?.focus()
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();onClose()}
      if(e.key==='ArrowLeft'){e.preventDefault();onIndex((index-1+images.length)%images.length)}
      if(e.key==='ArrowRight'){e.preventDefault();onIndex((index+1)%images.length)}
    }
    window.addEventListener('keydown',key)
    return()=>{window.removeEventListener('keydown',key);prev?.focus()}
  },[index,onClose,onIndex,images.length])
  const current=index===null?null:images[index]
  return createPortal(<AnimatePresence>
    {current ? <div className="nk-viewer" role="dialog" aria-modal="true" aria-label="Artwork preview">
      <motion.button type="button" className="nk-viewer__backdrop"
        aria-label="Close artwork preview" onClick={onClose}
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/>
      <motion.div className="nk-viewer__panel"
        initial={{opacity:0,scale:reduced?1:.95}} animate={{opacity:1,scale:1}}
        exit={{opacity:0,scale:reduced?1:.96}}
        transition={reduced?{duration:0}:{type:'spring',stiffness:400,damping:37}}>
        <div className="nk-viewer__toolbar">
          <span>{current.alt}</span>
          <button type="button" ref={closeRef} onClick={onClose} aria-label="Close preview"><X size={20}/></button>
        </div>
        <img src={current.src} alt={current.alt}/>
        <div className="nk-viewer__controls">
          <button type="button" onClick={()=>onIndex((index!-1+images.length)%images.length)}
            disabled={images.length<2} aria-label="Previous artwork"><ChevronLeft size={20}/></button>
          <span>{index!+1} / {images.length}</span>
          {onChoose&&<button type="button" className="nk-viewer__select"
            onClick={()=>onChoose(current.path??null)}><Check size={16}/> Use cover</button>}
          <button type="button" onClick={()=>onIndex((index!+1)%images.length)}
            disabled={images.length<2} aria-label="Next artwork"><ChevronRight size={20}/></button>
        </div>
      </motion.div>
    </div>:null}
  </AnimatePresence>,document.body)
}
