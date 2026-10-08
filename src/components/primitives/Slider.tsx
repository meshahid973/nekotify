import { useState } from 'react'
import type { CSSProperties, InputHTMLAttributes, PointerEvent } from 'react'

import './Slider.css'

interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'min' | 'max' | 'step' | 'onChange'> {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  buffered?: number
  formatValue?: (value: number) => string
  onValueChange: (value: number) => void
}

export function Slider({
  label, value, min = 0, max = 1, step = 0.01,
  buffered, formatValue, onValueChange, className = '',
  onPointerMove, onPointerLeave, onBlur, ...props
}: SliderProps) {
  const [preview, setPreview] = useState<number | null>(null)
  const safeMin = Number.isFinite(min) ? min : 0
  const safeMax = Number.isFinite(max) && max > safeMin ? max : safeMin + 1
  const clamped = Number.isFinite(value) ? Math.min(safeMax, Math.max(safeMin, value)) : safeMin
  const span = safeMax - safeMin
  const progress = ((clamped - safeMin) / span) * 100
  const bufferedProgress = buffered !== undefined && Number.isFinite(buffered)
    ? Math.max(progress, Math.min(100, Math.max(0, ((buffered - safeMin) / span) * 100)))
    : progress
  const previewValue = preview ?? clamped
  const tipProgress = ((previewValue - safeMin) / span) * 100

  const updatePreview = (event: PointerEvent<HTMLInputElement>) => {
    if (formatValue && event.pointerType !== 'touch') {
      const rect = event.currentTarget.getBoundingClientRect()
      if (rect.width > 0) {
        const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
        const raw = safeMin + fraction * span
        const snapped = Math.round((raw - safeMin) / step) * step + safeMin
        setPreview(Math.min(safeMax, Math.max(safeMin, snapped)))
      }
    }
    onPointerMove?.(event)
  }

  return (
    <div className={['slider-control', className].filter(Boolean).join(' ')}
      style={{
        '--slider-progress': `${progress}%`,
        '--slider-buffered': `${bufferedProgress}%`,
        '--slider-tip-progress': `${tipProgress}%`,
      } as CSSProperties}>
      <input
        {...props}
        className="slider"
        type="range"
        min={safeMin} max={safeMax} step={step} value={clamped}
        aria-label={label}
        aria-valuetext={formatValue?.(clamped)}
        onChange={(event) => onValueChange(event.currentTarget.valueAsNumber)}
        onPointerMove={updatePreview}
        onPointerLeave={(event) => { setPreview(null); onPointerLeave?.(event) }}
        onBlur={(event) => { setPreview(null); onBlur?.(event) }}
      />
      {formatValue ? (
        <output className="slider-control__tooltip" aria-hidden="true">
          {formatValue(previewValue)}
        </output>
      ) : null}
    </div>
  )
}
