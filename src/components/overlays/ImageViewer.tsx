import { Dialog } from '@base-ui/react/dialog'
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect } from 'react'
import './ImageViewer.css'

export interface ViewableImage { path?:string;src:string;alt:string }

export function ImageViewer({images,index,onIndex,onClose,onChoose}:{
  images:ViewableImage[];index:number|null;onIndex:(index:number)=>void
  onClose:()=>void;onChoose?:(path:string|null)=>void
}) {
  const current=index===null?null:images[index]
  useEffect(()=>{
    if(index===null || !current)return
    const key=(event:KeyboardEvent)=>{
      if (event.key==='ArrowLeft' && images.length>1){
        event.preventDefault();onIndex((index-1+images.length)%images.length)
      }else if(event.key==='ArrowRight' && images.length>1){
        event.preventDefault();onIndex((index+1)%images.length)
      }
    }
    window.addEventListener('keydown',key)
    return()=>window.removeEventListener('keydown',key)
  },[index,current,images.length,onIndex])
  return <Dialog.Root open={Boolean(current)} onOpenChange={(next)=>{if(!next)onClose()}}>
    <Dialog.Portal>
      <div className="nk-viewer">
        <Dialog.Backdrop className="nk-viewer__backdrop"/>
        <Dialog.Popup className="nk-viewer__panel">
          <div className="nk-viewer__toolbar">
            <Dialog.Title>Artwork preview</Dialog.Title>
            <Dialog.Close aria-label="Close preview"><X size={20}/></Dialog.Close>
          </div>
          {current ? <img src={current.src} alt={current.alt}/> : null}
          <div className="nk-viewer__controls">
            <button type="button" onClick={()=>onIndex(((index??0)-1+images.length)%images.length)}
              disabled={images.length<2} aria-label="Previous artwork"><ChevronLeft size={20}/></button>
            <span>{(index??0)+1} / {images.length}</span>
            {onChoose&&current&&<button type="button" className="nk-viewer__select"
              onClick={()=>onChoose(current.path??null)}><Check size={16}/> Use cover</button>}
            <button type="button" onClick={()=>onIndex(((index??0)+1)%images.length)}
              disabled={images.length<2} aria-label="Next artwork"><ChevronRight size={20}/></button>
          </div>
        </Dialog.Popup>
      </div>
    </Dialog.Portal>
  </Dialog.Root>
}
