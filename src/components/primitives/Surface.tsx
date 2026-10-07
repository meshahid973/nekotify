import type { HTMLAttributes, ReactNode } from 'react'

import './Surface.css'

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  tone?: 'default' | 'raised' | 'subtle'
}

export function Surface({
  children,
  tone = 'default',
  className = '',
  ...props
}: SurfaceProps) {
  return (
    <div
      className={`surface surface--${tone} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
