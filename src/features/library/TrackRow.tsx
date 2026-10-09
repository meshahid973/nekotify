import { Heart, Info, ListPlus, Paintbrush, Pause, Play, Music2 } from 'lucide-react'

import { Artwork } from '@/components/artwork/Artwork'
import { ContextMenu } from '@/components/overlays/ContextMenu'
import { PlaylistCombobox } from '@/components/overlays/PlaylistCombobox'
import { PulseHeart } from '@/components/reactbits/PulseHeart'
import { writeTrackDrag } from '@/features/library/trackDrag'
import { useTrackDetailsStore } from '@/features/library/track-details.store'
import { notify } from '@/stores/toast.store'
import { useCollectionsStore } from '@/features/collections/collections.store'
import { formatPlaybackTime } from '@/features/playback/playback.utils'
import { useQueueStore } from '@/features/queue/queue.store'
import { useCoverPickerStore } from '@/features/library/cover-picker.store'
import type { Track } from '@/types/media'

import './TrackRow.css'

interface TrackRowProps {
  track: Track
  active?: boolean
  playing?: boolean
  onPlay: () => void
  onRemoveFromPlaylist?:()=>void
}

export function TrackRow({
  track, active = false, playing = false, onPlay,onRemoveFromPlaylist,
}: TrackRowProps) {
  const favorites = useCollectionsStore((state) => state.favorites)
  const playlists = useCollectionsStore((state) => state.playlists)
  const toggleFavorite = useCollectionsStore((state) => state.toggleFavorite)
  const addToPlaylist = useCollectionsStore((state) => state.addToPlaylist)
  const favorite = favorites.includes(track.source.path)

  return (
    <ContextMenu items={[
      {id:'play',label:'Play',icon:<Music2 size={16}/>,onClick:onPlay},
      {id:'next',label:'Play next',icon:<ListPlus size={16}/>,onClick:()=>{
        useQueueStore.getState().playNext(track);notify('Added to queue','success')
      }},
      {id:'favorite',label:favorite?'Unlike song':'Like song',icon:<Heart size={16}/>,onClick:()=>{
        void toggleFavorite(track.source.path);notify(favorite?'Removed favorite':'Added favorite','info')
      }},
      {id:'details',label:'Song details',icon:<Info size={16}/>,
        onClick:()=>useTrackDetailsStore.getState().open(track)},
      {id:'artwork',label:'Change artwork',icon:<Paintbrush size={16}/>,onClick:()=>useCoverPickerStore.getState().open(track.source.path)},
      ...(onRemoveFromPlaylist?[{id:'remove-from-playlist',label:'Remove from this playlist',
        onClick:onRemoveFromPlaylist}]:[]),
      ...playlists.map(p=>({id:'playlist-'+p.id,label:'Add to '+p.name,onClick:()=>{
        void addToPlaylist(p.id,track.source.path);notify('Added to '+p.name,'info')
      }})),
    ]}>
    <div className="track-row" data-active={active?'true':'false'}
      tabIndex={0} role="group" aria-label={track.title+' by '+track.artist}
      draggable onDragStart={(event)=>{
        if((event.target as HTMLElement).closest('button')){event.preventDefault();return}
        writeTrackDrag(event.dataTransfer,track.source.path)
      }}
      onKeyDown={event=>{
        if(event.target!==event.currentTarget)return
        if(event.key==='Enter'){event.preventDefault();onPlay()}
        if(event.key.toLowerCase()==='i'&&!event.ctrlKey&&!event.altKey){
          event.preventDefault();useTrackDetailsStore.getState().open(track)
        }
      }}>
      <button type="button" className="track-row__play"
        aria-label={(playing ? 'Pause ' : 'Play ') + track.title} onClick={onPlay}>
        {playing ? <Pause size={15} fill="currentColor" /> :
          <Play size={15} fill="currentColor" />}
      </button>
      <Artwork size="sm" src={track.artwork?.uri} alt={track.artwork?.alt ?? ''} />
      <div className="track-row__identity">
        <strong>{track.title}</strong><span>{track.artist}</span>
      </div>
      <span className="track-row__album">{track.album ?? 'Local files'}</span>
      <time className="track-row__duration">{formatPlaybackTime(track.duration)}</time>
      <div className="track-row__actions">
        <button
          className={favorite ? 'track-row__icon track-row__icon--active' : 'track-row__icon'}
          type="button" aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={favorite}
          onClick={() => {void toggleFavorite(track.source.path);notify(favorite?'Removed from Liked songs':'Added to Liked songs','info')}}
        ><PulseHeart liked={favorite} size={16}/></button>
        <button type="button" className="track-row__icon"
          title="Play next" aria-label={'Play ' + track.title + ' next'}
          onClick={() => {useQueueStore.getState().playNext(track);notify('Playing next: '+track.title,'success')}}
        ><ListPlus size={16}/></button>
        <button type="button" className="track-row__icon"
          aria-label={'Choose artwork for ' + track.title}
          title="Choose artwork"
          onClick={() => useCoverPickerStore.getState().open(track.source.path)}
        ><Paintbrush size={15}/></button>
        <button type="button" className="track-row__icon"
          aria-label={'Song details for '+track.title}
          title="Song details"
          onClick={()=>useTrackDetailsStore.getState().open(track)}>
          <Info size={15}/>
        </button>
        {onRemoveFromPlaylist?<button type="button" className="track-row__icon"
          aria-label={'Remove '+track.title+' from this playlist'}
          onClick={onRemoveFromPlaylist}><ListPlus size={16}/></button>:null}
        {playlists.length > 0 ? (
          <PlaylistCombobox label={'Add '+track.title+' to playlist'}
            playlists={playlists} onChoose={(playlist)=>{
              void addToPlaylist(playlist.id,track.source.path)
              notify('Added to '+playlist.name,'info')
            }}/>
        ) : null}
      </div>

    </div>
    </ContextMenu>
  )
}
