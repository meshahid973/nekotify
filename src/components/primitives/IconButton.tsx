import { Tooltip } from '@base-ui/react/tooltip'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './IconButton.css'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function IconButton({
  label,children,size='md',className='',...props
}:IconButtonProps) {
  return <Tooltip.Root>
    <Tooltip.Trigger render={<button type="button" {...props}
      className={['icon-button','icon-button--'+size,className].filter(Boolean).join(' ')}
      aria-label={label}>{children}</button>}/>
    <Tooltip.Portal>
      <Tooltip.Positioner sideOffset={9} className="nk-tooltip-positioner">
        <Tooltip.Popup className="nk-tooltip">{label}</Tooltip.Popup>
      </Tooltip.Positioner>
    </Tooltip.Portal>
  </Tooltip.Root>
}
