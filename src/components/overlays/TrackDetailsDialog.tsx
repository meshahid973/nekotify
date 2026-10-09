import { invoke, isTauri } from '@tauri-apps/api/core'
import { Dialog } from '@base-ui/react/dialog'
import { FileAudio2, ImagePlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Artwork } from '@/components/artwork/Artwork'
import { Button } from '@/components/primitives/Button'
import { useCoverPickerStore } from '@/features/library/cover-picker.store'
import { useLibraryStore } from '@/features/library/library.store'
import { useTrackDetailsStore } from '@/features/library/track-details.store'
import { formatPlaybackTime } from '@/features/playback/playback.utils'
import type { Track } from '@/types/media'
import './TrackDetailsDialog.css'

interface FileInfo{
  sizeBytes:number;modifiedMs:number|null;extension:string
  embeddedTitle:string|null;embeddedArtist:string|null;embeddedAlbum:string|null
}

function DetailsBody({track,onClose}:{track:Track;onClose:()=>void}){
  const [title,setTitle]=useState(track.title)
  const [artist,setArtist]=useState(track.artist)
  const [album,setAlbum]=useState(track.album??'')
  const [details,setDetails]=useState<FileInfo|null>(null)
  const [saving,setSaving]=useState(false)
  const update=useLibraryStore(s=>s.updateMetadata)
  useEffect(()=>{
    if(!isTauri())return
    let alive=true
    void invoke<FileInfo>('get_track_file_info',{path:track.source.path})
      .then(info=>{if(alive)setDetails(info)})
      .catch(()=>{/* Offline drives retain editable cached metadata. */})
    return()=>{alive=false}
  },[track.source.path])
  const save=async()=>{
    if(!title.trim()||!artist.trim()||saving)return
    setSaving(true)
    const ok=await update(track.source.path,{title,artist,album})
    setSaving(false)
    if(ok)onClose()
  }
  const useEmbedded=()=>{
    if(!details)return
    if(details.embeddedTitle)setTitle(details.embeddedTitle)
    if(details.embeddedArtist)setArtist(details.embeddedArtist)
    setAlbum(details.embeddedAlbum??'')
  }
  const pickArtwork=()=>{
    const path=track.source.path
    onClose()
    window.queueMicrotask(()=>useCoverPickerStore.getState().open(path))
  }
  return <>
    <div className="track-details__top">
      <Artwork size="lg" src={track.artwork?.uri} alt="Track artwork"/>
      <div><Dialog.Title>Song details</Dialog.Title>
        <Dialog.Description>
          Correct the library display without editing the original audio file.
        </Dialog.Description>
        <Button variant="secondary" size="sm" onClick={pickArtwork}>
          <ImagePlus size={15}/> Change artwork
        </Button>
      </div>
      <Dialog.Close className="track-details__close" aria-label="Close details"><X size={18}/></Dialog.Close>
    </div>
    <form className="track-details__form" onSubmit={event=>{
      event.preventDefault();void save()
    }}>
      <label>Title<input value={title} onChange={e=>setTitle(e.currentTarget.value)}
        maxLength={180} required autoFocus/></label>
      <label>Artist<input value={artist} onChange={e=>setArtist(e.currentTarget.value)}
        maxLength={120} required/></label>
      <label>Album<input value={album} onChange={e=>setAlbum(e.currentTarget.value)}
        maxLength={180}/></label>
      <div className="track-details__file">
        <strong><FileAudio2 size={15}/> Original file</strong>
        <p title={track.source.path}>{track.source.path}</p>
        <div><span>{details?.extension??'Audio'}</span>
          <span>{formatPlaybackTime(track.duration)}</span>
          {details?<span>{(details.sizeBytes/1024/1024).toFixed(1)} MB</span>:null}
          {details?.modifiedMs?<span>
            {new Date(details.modifiedMs).toLocaleDateString()}
          </span>:null}
        </div>
        {details&&
          <button type="button" onClick={useEmbedded} className="track-details__restore">
            Fill from embedded tags
          </button>}
      </div>
      <div className="track-details__actions">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving||!title.trim()||!artist.trim()}>
          {saving?'Saving…':'Save changes'}
        </Button>
      </div>
    </form>
  </>
}
export function TrackDetailsDialog(){
  const track=useTrackDetailsStore(s=>s.track)
  const close=useTrackDetailsStore(s=>s.close)
  return <Dialog.Root open={Boolean(track)} onOpenChange={next=>{
    if(!next)close()
  }}>
    <Dialog.Portal>
      <div className="track-details" role="presentation">
        <Dialog.Backdrop className="track-details__backdrop"/>
        <Dialog.Popup className="track-details__panel">
          {track?<DetailsBody key={track.source.path} track={track} onClose={close}/>:null}
        </Dialog.Popup>
      </div>
    </Dialog.Portal>
  </Dialog.Root>
}
