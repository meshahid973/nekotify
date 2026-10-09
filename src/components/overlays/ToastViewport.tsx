import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Info, X, AlertCircle } from 'lucide-react'
import { useEffect } from 'react'
import { useToastStore } from '@/stores/toast.store'
import type { ToastMessage } from '@/stores/toast.store'
import './Overlays.css'
export function ToastViewport() {
  const messages=useToastStore(s=>s.messages)
  const remove=useToastStore(s=>s.remove)
  const reduced=useReducedMotion()
  return <div className="nk-toasts" aria-live="polite" aria-label="Notifications">
    <AnimatePresence initial={false}>
      {messages.map(msg=><ToastItem key={msg.id} msg={msg}
        remove={remove} reduced={Boolean(reduced)}/>)}
    </AnimatePresence>
  </div>
}
function ToastItem({msg,remove,reduced}:{
  msg:ToastMessage;remove:(id:number)=>void;reduced:boolean
}) {
  useEffect(()=>{
    const timeout=window.setTimeout(()=>remove(msg.id),
      msg.action?8000:msg.kind==='error'?6500:3400)
    return()=>window.clearTimeout(timeout)
  },[msg,remove])
  const Icon=msg.kind==='success'?Check:msg.kind==='error'?AlertCircle:Info
  return <motion.div className="nk-toast" role={msg.kind==='error'?'alert':'status'}
    initial={{opacity:0,y:reduced?0:14,scale:reduced?1:.97}}
    animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,x:reduced?0:20}}
    transition={reduced?{duration:0}:{type:'spring',stiffness:470,damping:36}}>
    <Icon size={17}/><span>{msg.text}</span>
    {msg.action&&<button type="button" className="nk-toast__action"
      onClick={()=>{msg.action?.run();remove(msg.id)}}>{msg.action.label}</button>}
    <button type="button" aria-label="Dismiss notification"
      onClick={()=>remove(msg.id)}><X size={15}/></button>
  </motion.div>
}
