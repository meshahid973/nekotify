import { ContextMenu as BaseContextMenu } from '@base-ui/react/context-menu'
import type { ReactElement, ReactNode } from 'react'
import './Overlays.css'

export interface MenuAction {
  id:string;label:string;icon?:ReactNode;onClick:()=>void;disabled?:boolean
}

/** Base UI owns right-click/long-press, overflow positioning, keyboard navigation
 * and focus restoration. TrackRow continues to expose visible action buttons. */
export function ContextMenu({children,items}:{
  children:ReactElement;items:MenuAction[]
}) {
  return <BaseContextMenu.Root>
    <BaseContextMenu.Trigger render={children}/>
    <BaseContextMenu.Portal>
      <BaseContextMenu.Positioner className="nk-context-positioner" sideOffset={3}>
        <BaseContextMenu.Popup className="nk-context">
          {items.map(item=><BaseContextMenu.Item className="nk-context__item"
            key={item.id} disabled={item.disabled}
            onClick={item.onClick}>
            {item.icon}<span>{item.label}</span>
          </BaseContextMenu.Item>)}
        </BaseContextMenu.Popup>
      </BaseContextMenu.Positioner>
    </BaseContextMenu.Portal>
  </BaseContextMenu.Root>
}
