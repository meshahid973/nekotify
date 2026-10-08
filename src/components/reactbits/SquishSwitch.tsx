import { motion, useReducedMotion } from 'motion/react'
import { useUiStore } from '@/stores/ui.store'
import './SquishSwitch.css'

/** React Bits Squish Switch-inspired monochrome controlled toggle. */
export function SquishSwitch({checked,onChange,label,disabled=false}:{
  checked:boolean;onChange:(checked:boolean)=>void;label:string;disabled?:boolean
}) {
  const systemReduced=useReducedMotion()
  const preference=useUiStore((s)=>s.motionPreference)
  const reduce=Boolean(systemReduced)||preference==='reduced'
  return <button type="button" role="switch" aria-label={label}
    aria-checked={checked} disabled={disabled}
    className="nk-squish"
    onClick={()=>onChange(!checked)}>
    <span className="nk-squish__track">
      <motion.span className="nk-squish__thumb"
        animate={{x:checked?22:0,scaleX:1}}
        whileTap={reduce?undefined:{scaleX:1.3,scaleY:.9}}
        transition={reduce?{duration:0}:{type:'spring',stiffness:440,damping:25,mass:.52}}/>
    </span>
  </button>
}
