import type { CSSProperties, InputHTMLAttributes } from 'react'

import './Slider.css'

interface SliderProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'min' | 'max' | 'step' | 'onChange'
  > {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onValueChange: (value: number) => void
}

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onValueChange,
  className = '',
  ...props
}: SliderProps) {
  const span = max - min
  const progress =
    span <= 0 ? 0 : Math.min(Math.max(((value - min) / span) * 100, 0), 100)

  return (
    <input
      {...props}
      type="range"
      aria-label={label}
      className={`slider ${className}`.trim()}
      min={min}
      max={max}
      step={step}
      value={value}
      style={
        {
          '--slider-progress': `${progress}%`,
        } as CSSProperties
      }
      onChange={(event) => onValueChange(event.currentTarget.valueAsNumber)}
    />
  )
}
