import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useUiStore } from '@/stores/ui.store'

/** React Bits FadeContent-inspired reveal, implemented with existing Motion. */
export function FadeContent({children}:{children:ReactNode}) {
  const system=useReducedMotion()
  const preference=useUiStore((s)=>s.motionPreference)
  const reduced=Boolean(system)||preference==='reduced'
  return <motion.div
    initial={reduced?false:{opacity:0,y:9}}
    whileInView={{opacity:1,y:0}}
    viewport={{once:true,amount:.08}}
    transition={{duration:reduced?0:.34,ease:[.16,1,.3,1]}}
    style={{minWidth:0}}>{children}</motion.div>
}
