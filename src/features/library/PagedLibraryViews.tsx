import { useState } from 'react'
import { Artwork } from '@/components/artwork/Artwork'
import { VirtualTrackList } from '@/features/library/VirtualTrackList'
import { playLibraryTrack } from '@/features/library/playLibraryTrack'
import { useNativeTracks,useNativeGroups,resolveGroupArtwork,playNativeGroup } from '@/features/library/nativePages'
import type { NativeGroupSummary } from '@/features/library/nativePages'
import { notify } from '@/stores/toast.store'
import type { Track } from '@/types/media'

interface TrackPageProps {
  mode:'songs'|'favorites'|'playlist'
  query?:string
  playlistId?:number
  fallback:Track[]|(()=>Track[])
  refreshKey?:string|number
  emptyTitle?:string
  onRemoveFromPlaylist?:(track:Track)=>void
}
export function PagedTrackList({mode,query,playlistId,fallback,
  refreshKey=0,emptyTitle='No songs found',onRemoveFromPlaylist}:TrackPageProps){
  const page=useNativeTracks({mode,query,playlistId,refreshKey})
  const items=page.enabled?page.items:(typeof fallback==='function'?fallback():fallback)
  if(page.loading&&page.enabled&&!items.length){
    return <p className="library-page__result-state" role="status">Loading songs…</p>
  }
  return <div className="library-page__results">
    {items.length?<VirtualTrackList tracks={items}
      onRemoveFromPlaylist={onRemoveFromPlaylist}/>:
      <p className="library-page__result-state">{emptyTitle}</p>}
    {page.enabled&&items.length<page.total?
      <button type="button" className="library-page__load-more"
        disabled={page.moreLoading} onClick={()=>void page.loadMore()}>
        {page.moreLoading?'Loading…':`Load more · ${items.length} of ${page.total}`}
      </button>:null}
  </div>
}

interface TrackGroup {
  key:string;title:string;subtitle:string;tracks:Track[]
}
export function PagedGroupList({mode,query,fallback,refreshKey=0}:{
  mode:'albums'|'artists';query:string;fallback:TrackGroup[]|(()=>TrackGroup[]);refreshKey?:number
}){
  const page=useNativeGroups(mode,query,refreshKey)
  const [playing,setPlaying]=useState<string|null>(null)
  const fallbackGroups=()=>typeof fallback==='function'?fallback():fallback
  const list=page.enabled?page.items:fallbackGroups().map(group=>{
    const first=group.tracks.find(t=>t.artwork)
    return {
      title:group.title,artist:mode==='albums'?group.tracks[0]?.artist??'': '',
      count:group.tracks.length,artworkPath:first?.artwork?.path??null,
    } satisfies NativeGroupSummary
  })
  const play=async(group:NativeGroupSummary)=>{
    if(playing)return
    const key=group.title+'\u001f'+group.artist
    setPlaying(key)
    try{
      const matching=fallbackGroups().find(item=>
        item.title===group.title&&(mode==='artists' ||
          (item.tracks[0]?.artist??'')===group.artist))
      const tracks=matching?.tracks.length?matching.tracks:await playNativeGroup(mode,group)
      if(tracks[0])await playLibraryTrack(tracks[0],tracks)
    }catch{notify('Could not load this collection','error')}
    finally{setPlaying(null)}
  }
  return <div className="library-collection-list">
    {page.loading&&page.enabled&&!list.length?
      <p className="library-page__result-state" role="status">Loading collections…</p>:null}
    {!list.length&&!page.loading?
      <p className="library-page__result-state">Nothing here yet. Add music to start.</p>:null}
    {list.map(group=>{
      const key=group.title+'\u001f'+group.artist
      return <button type="button" key={key} className="library-collection-row"
        disabled={playing!==null} onClick={()=>void play(group)}>
        <Artwork size="sm" src={resolveGroupArtwork(group.artworkPath)} alt=""/>
        <span className="library-collection-row__copy">
          <strong>{group.title}</strong>
          <small>{mode==='albums'?group.artist:
            `${group.count} ${group.count===1?'song':'songs'}`}</small>
        </span>
        <span>{group.count} songs</span>
      </button>
    })}
    {page.enabled&&list.length<page.total?
      <button type="button" className="library-page__load-more"
        disabled={page.moreLoading} onClick={()=>void page.loadMore()}>
        {page.moreLoading?'Loading…':`Load more · ${list.length} of ${page.total}`}
      </button>:null}
  </div>
}
