import type { LucideIcon } from 'lucide-react'
import './AnimatedIcon.css'

type IconMotion = 'lift' | 'left' | 'right' | 'tilt' | 'pulse' | 'sway'

interface AnimatedIconProps {
  icon: LucideIcon
  size?: number
  variant?: IconMotion
}

export function AnimatedIcon({
  icon: Icon, size = 17, variant = 'lift',
}: AnimatedIconProps) {
  return (
    <span className={'animated-icon animated-icon--' + variant} aria-hidden="true">
      <Icon size={size} />
    </span>
  )
}
