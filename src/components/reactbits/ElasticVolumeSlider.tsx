import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import type { PointerEvent } from 'react'
import { Slider } from '@/components/primitives/Slider'
import { useUiStore } from '@/stores/ui.store'
import './ElasticVolumeSlider.css'

/** React Bits ElasticSlider adapted for a controlled, native-accessible volume range.
 * Visual edges yield on an overdrag; slider value is clamped by native range. */
export function ElasticVolumeSlider({value,onValueChange,className=''}:{
  value:number;onValueChange:(value:number)=>void;className?:string
}) {
  const reducedSystem=useReducedMotion()
  const preference=useUiStore((s)=>s.motionPreference)
  const reduced=Boolean(reducedSystem)||preference==='reduced'
  const bend=useMotionValue(0)
  const spring=useSpring(bend,{stiffness:420,damping:20,mass:.45})
  const move=(event:PointerEvent<HTMLDivElement>)=>{
    if(reduced||event.buttons!==1){bend.set(0);return}
    const box=event.currentTarget.getBoundingClientRect()
    const overflow=event.clientX<box.left?event.clientX-box.left:
      event.clientX>box.right?event.clientX-box.right:0
    bend.set(Math.min(9,Math.max(-9,overflow*.28)))
  }
  return <div className={'nk-elastic-volume '+className}
    onPointerMove={move} onPointerLeave={()=>bend.set(0)}
    onPointerUp={()=>bend.set(0)} onPointerCancel={()=>bend.set(0)}>
    <motion.div className="nk-elastic-volume__visual" style={{x:reduced?0:spring}}>
      <Slider label="Volume" min={0} max={1} step={.01} value={value}
        formatValue={(v)=>Math.round(v*100)+'%'} onValueChange={onValueChange}/>
    </motion.div>
  </div>
}
