import type { ReactNode } from 'react'
import type { HTMLMotionProps } from 'motion/react'
import { motion, useReducedMotion } from 'motion/react'
import { useUiStore } from '@/stores/ui.store'

import './Button.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md'

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const systemReduced = useReducedMotion()
  const preference = useUiStore((state)=>state.motionPreference)
  const reduced = Boolean(systemReduced) || preference === 'reduced'
  return (
    <motion.button
      whileTap={reduced?undefined:{scale:.96}}
      transition={{type:'spring',stiffness:550,damping:35}}
      type={type}
      className={`button button--${variant} button--${size} ${className}`.trim()}
      {...props}
    >
      {children}
    </motion.button>
  )
}
