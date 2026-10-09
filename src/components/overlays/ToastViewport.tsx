import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Info, X, AlertCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useToastStore } from '@/stores/toast.store'
import './Overlays.css'
export function ToastViewport() {
  const messages=useToastStore(s=>s.messages)
  const remove=useToastStore(s=>s.remove)
  const reduced=useReducedMotion()
  return <div className="nk-toasts" aria-live="polite" aria-label="Notifications">
    <AnimatePresence initial={false}>
      {messages.map(msg=><ToastItem key={msg.id} id={msg.id} kind={msg.kind} text={msg.text}
        remove={remove} reduced={Boolean(reduced)}/>)}
    </AnimatePresence>
  </div>
}
function ToastItem({id,kind,text,remove,reduced}:{
  id:number;kind:'success'|'error'|'info';text:string;remove:(id:number)=>void;reduced:boolean
}) {
  useEffect(()=>{
    const timeout=window.setTimeout(()=>remove(id),kind==='error'?6500:3400)
    return ()=>window.clearTimeout(timeout)
  },[id,kind,remove])
  const Icon=kind==='success'?Check:kind==='error'?AlertCircle:Info
  return <motion.div className="nk-toast" role={kind==='error'?'alert':'status'}
    initial={{opacity:0,y:reduced?0:14,scale:reduced?1:.97}}
    animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,x:reduced?0:20}}
    transition={reduced?{duration:0}:{type:'spring',stiffness:470,damping:36}}>
    <Icon size={17}/><span>{text}</span>
    <button type="button" aria-label="Dismiss notification" onClick={()=>remove(id)}><X size={15}/></button>
  </motion.div>
}
