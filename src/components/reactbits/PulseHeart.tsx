import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Heart } from 'lucide-react'
import { useUiStore } from '@/stores/ui.store'
import './PulseHeart.css'

/** React Bits Pulse Heart animation only — parent owns favorite state and click. */
export function PulseHeart({liked,size=17}:{liked:boolean;size?:number}) {
  const sys=useReducedMotion()
  const pref=useUiStore((s)=>s.motionPreference)
  const reduced=Boolean(sys)||pref==='reduced'
  return <span className="nk-pulse-heart" aria-hidden="true">
    <AnimatePresence initial={false}>
      {liked ? <motion.span key="liked" className="nk-pulse-heart__icon"
        initial={{scale:reduced?1:.62}} animate={{scale:1}}
        exit={{scale:1}} transition={reduced?{duration:0}:{type:'spring',stiffness:480,damping:17}}>
        <Heart size={size} fill="currentColor"/>
      </motion.span> : <motion.span key="idle" className="nk-pulse-heart__icon"
        initial={{scale:1}} animate={{scale:1}}
        transition={{duration:0}}><Heart size={size}/></motion.span>}
    </AnimatePresence>
    {liked&&!reduced?<motion.span className="nk-pulse-heart__ring" key="ring"
      initial={{scale:.2,opacity:.8}} animate={{scale:1.8,opacity:0}}
      transition={{duration:.38}}/>:null}
  </span>
}
