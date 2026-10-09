import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { useUiStore } from '@/stores/ui.store'
import './ShortcutHelp.css'

const shortcuts=[
  ['Ctrl + K','Search songs and commands'],
  ['Ctrl + L','Open Library'],
  ['Ctrl + B','Expand or collapse sidebar'],
  ['Ctrl + /','Show keyboard shortcuts'],
  ['Space','Play or pause when not editing'],
  ['M','Mute when not editing'],
  ['Enter','Play a focused track'],
  ['I','Open details for a focused track'],
  ['Shift + F10','Open a focused track context menu'],
]
export function ShortcutHelp(){
  const open=useUiStore(s=>s.shortcutsOpen)
  const setOpen=useUiStore(s=>s.setShortcutsOpen)
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Portal>
      <div className="shortcut-help">
        <Dialog.Backdrop className="shortcut-help__backdrop"/>
        <Dialog.Popup className="shortcut-help__panel">
          <div className="shortcut-help__heading">
            <Dialog.Title>Keyboard shortcuts</Dialog.Title>
            <Dialog.Close aria-label="Close shortcuts"><X size={19}/></Dialog.Close>
          </div>
          <Dialog.Description className="shortcut-help__description">
            Use these shortcuts from the player, library or queue.
          </Dialog.Description>
          <dl>{shortcuts.map(([keys,description])=><div key={keys}>
            <dt><kbd>{keys}</kbd></dt><dd>{description}</dd>
          </div>)}</dl>
        </Dialog.Popup>
      </div>
    </Dialog.Portal>
  </Dialog.Root>
}
