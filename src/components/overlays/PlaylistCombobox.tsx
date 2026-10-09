import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronDown } from 'lucide-react'
import { useMemo } from 'react'
import type { Playlist } from '@/features/collections/collections.store'
import './Overlays.css'

/** Base UI popup-select combobox handles typing, keyboard selection,
 * focus return, collisions and outside dismissals. */
export function PlaylistCombobox({label,playlists,onChoose}:{
  label:string;playlists:Playlist[];onChoose:(playlist:Playlist)=>void
}) {
  const collection=useMemo(()=>Combobox.createItems(playlists,{
    getValue:(playlist)=>playlist.id,
    getLabel:(playlist)=>playlist.name,
  }),[playlists])
  return <Combobox.Root items={collection} value={null}
    onValueChange={(id)=>{
      const playlist=playlists.find(p=>p.id===id)
      if(playlist) onChoose(playlist)
    }}>
    <Combobox.Trigger className="nk-combo__trigger" aria-label={label}>
      Playlist <ChevronDown size={12}/>
    </Combobox.Trigger>
    <Combobox.Portal>
      <Combobox.Positioner className="nk-base-combo-positioner" sideOffset={6} align="end">
        <Combobox.Popup className="nk-base-combo" aria-label={label}>
          <Combobox.Input className="nk-base-combo__input"
            placeholder="Find playlist…" aria-label={'Search playlists for '+label} autoComplete="off"/>
          <Combobox.Empty className="nk-base-combo__empty">No playlists found</Combobox.Empty>
          <Combobox.List className="nk-base-combo__list">
            {(playlist:Playlist)=><Combobox.Item key={playlist.id}
              className="nk-base-combo__item" value={playlist.id}>
              <span>{playlist.name}</span>
              <Combobox.ItemIndicator><Check size={14}/></Combobox.ItemIndicator>
            </Combobox.Item>}
          </Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  </Combobox.Root>
}
