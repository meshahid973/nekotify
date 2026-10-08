import {
  AnimatePresence, motion, useMotionTemplate, useMotionValue,
  useReducedMotion, useSpring, useTransform, useVelocity,
} from 'motion/react'
import { useEffect, useState } from 'react'
import type {
  CSSProperties, FocusEvent, InputHTMLAttributes, PointerEvent,
} from 'react'

import { useUiStore } from '@/stores/ui.store'
import './Slider.css'

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'min' | 'max' | 'step' | 'onChange'> {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  buffered?: number
  formatValue?: (value: number) => string
  onValueChange: (value: number) => void
}

const GLIDE = { stiffness: 540, damping: 42, mass: 0.36 } as const
const TILT = { stiffness: 260, damping: 26, mass: 0.38 } as const
const BUBBLE = { type: 'spring', stiffness: 470, damping: 29, mass: 0.5 } as const

/** Native range input owns keyboard/touch semantics; Motion only paints the interaction. */
export function Slider({
  label, value, min = 0, max = 1, step = 0.01, buffered,
  formatValue, onValueChange, className = '',
  onPointerDown, onPointerUp, onPointerCancel, onPointerMove,
  onPointerLeave, onFocus, onBlur, disabled, ...props
}: SliderProps) {
  const [dragging, setDragging] = useState(false)
  const [focused, setFocused] = useState(false)
  const [preview, setPreview] = useState<number | null>(null)
  const systemReduced = useReducedMotion()
  const preference = useUiStore((state) => state.motionPreference)
  const reduce = Boolean(systemReduced) || preference === 'reduced'

  const safeMin = Number.isFinite(min) ? min : 0
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 1
  const safeStep = Number.isFinite(step) && step > 0 ? step : 0.01
  const current = Number.isFinite(value) ? Math.max(safeMin, Math.min(safeMax, value)) : safeMin
  const percent = 100 * (current - safeMin) / (safeMax - safeMin)
  const bufferedPercent = Number.isFinite(buffered)
    ? Math.min(100, Math.max(percent, 100 * ((buffered ?? safeMin) - safeMin) / (safeMax - safeMin)))
    : percent

  const target = useMotionValue(percent)
  useEffect(() => { target.set(percent) }, [target, percent])
  const smooth = useSpring(target, GLIDE)
  const position = reduce ? target : smooth
  const left = useMotionTemplate`${position}%`
  const speed = useVelocity(smooth)
  const direction = useTransform(speed, [-350, 0, 350], [1, 0, -1], { clamp: true })
  const lean = useSpring(direction, TILT)
  const rotate = useTransform(lean, (n) => n * 11)

  const move = (event: PointerEvent<HTMLInputElement>) => {
    if (formatValue && event.pointerType !== 'touch' && !disabled) {
      const bounds = event.currentTarget.getBoundingClientRect()
      if (bounds.width > 0) {
        const fraction = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
        const next = safeMin + fraction * (safeMax - safeMin)
        const snapped = safeMin + Math.round((next - safeMin) / safeStep) * safeStep
        setPreview(Math.min(safeMax, Math.max(safeMin, snapped)))
      }
    }
    onPointerMove?.(event)
  }

  const release = () => {
    setDragging(false)
    setPreview(null)
  }
  const activeBubble = Boolean(formatValue) && !disabled && (dragging || focused)
  const readout = formatValue ? formatValue(dragging && preview !== null ? preview : current) : ''
  const tipPercent = dragging && preview !== null
    ? 100 * (preview - safeMin) / (safeMax - safeMin)
    : percent

  return (
    <div className={['slider-control', className].filter(Boolean).join(' ')}
      data-dragging={dragging} data-disabled={Boolean(disabled)}
      style={{ '--slider-preview': `${tipPercent}%` } as CSSProperties}>
      <div className="slider-control__track" aria-hidden="true">
        <div className="slider-control__buffered" style={{ width: `${bufferedPercent}%` }}/>
        <motion.div className="slider-control__played" style={{ width: left }}/>
        <motion.div className="slider-control__thumb"
          style={{ left, x: '-50%', y: '-50%' }}
          animate={reduce ? undefined : { scale: dragging ? 1.2 : 1 }}
          transition={{ type: 'spring', stiffness: 510, damping: 30 }}/>
        <motion.div className="slider-control__bubble-anchor" style={{ left, x: '-50%' }}>
          <AnimatePresence initial={false}>
            {activeBubble ? (
              <motion.output
                key="readout"
                className="slider-control__bubble"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.85 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.9 }}
                transition={reduce ? { duration: 0.08 } : BUBBLE}
                style={reduce ? undefined : { rotate }}
              >{readout}</motion.output>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
      <input {...props} className="slider" type="range" min={safeMin}
        max={safeMax} step={safeStep} value={current} disabled={disabled}
        aria-label={label} aria-valuetext={formatValue?.(current)}
        onChange={(event) => onValueChange(event.currentTarget.valueAsNumber)}
        onPointerDown={(event) => { if (!disabled) setDragging(true); onPointerDown?.(event) }}
        onPointerUp={(event) => { release(); onPointerUp?.(event) }}
        onPointerCancel={(event) => { release(); onPointerCancel?.(event) }}
        onPointerMove={move}
        onPointerLeave={(event) => { if (!dragging) setPreview(null); onPointerLeave?.(event) }}
        onFocus={(event: FocusEvent<HTMLInputElement>) => { setFocused(true); onFocus?.(event) }}
        onBlur={(event: FocusEvent<HTMLInputElement>) => { setFocused(false); release(); onBlur?.(event) }}/>
    </div>
  )
}
