import type { ButtonHTMLAttributes, ReactNode } from 'react'

import './IconButton.css'

type IconButtonSize = 'sm' | 'md'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: IconButtonSize
  children: ReactNode
}

export function IconButton({
  label,
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={`icon-button icon-button--${size} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  )
}
