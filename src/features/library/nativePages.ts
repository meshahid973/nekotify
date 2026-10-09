import { convertFileSrc, invoke, isTauri } from '@tauri-apps/api/core'
import { useEffect, useRef, useState } from 'react'
import { useLibraryStore } from '@/features/library/library.store'
import { nativeTrackSearch,resolveNativeTrack } from '@/features/library/nativeQueries'
import type { NativeTrackPage } from '@/features/library/nativeQueries'
import type { Track } from '@/types/media'

type ViewMode='songs'|'favorites'|'playlist'|'album'|'artist'
type GroupMode='albums'|'artists'
export interface NativeGroupSummary {
  title:string;artist:string;count:number;artworkPath:string|null
}
interface GroupPage {items:NativeGroupSummary[];total:number;offset:number;limit:number}
interface TracksRequest {
  mode:ViewMode;query?:string;playlistId?:number;label?:string;artist?:string
  refreshKey?:string|number
}

const PAGE_SIZE=80
const groupFile=(mode:GroupMode,query:string,offset:number)=>
  invoke<GroupPage>('query_library_groups',{mode,query,offset,limit:PAGE_SIZE})

async function getTracks(request:TracksRequest,offset:number):Promise<NativeTrackPage>{
  const {mode,query='',playlistId,label,artist}=request
  if(mode==='songs'){
    if(query.trim())return nativeTrackSearch(query,offset,PAGE_SIZE)
    return invoke<NativeTrackPage>('query_tracks',{offset,limit:PAGE_SIZE})
  }
  return invoke<NativeTrackPage>('query_library_view',{
    mode,playlistId,label,artist,query,offset,limit:PAGE_SIZE,
  })
}

/** Async page state is independent from the entire legacy library snapshot.
 * Request generations discard slow stale results after a tab or filter switch. */
export function useNativeTracks(request:TracksRequest){
  const enabled=isTauri()
  const {mode,query='',playlistId,label,artist,refreshKey=0}=request
  const [items,setItems]=useState<Track[]>([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(enabled)
  const [moreLoading,setMoreLoading]=useState(false)
  const [failed,setFailed]=useState(false)
  const generation=useRef(0)
  useEffect(()=>{
    if(!enabled)return
    const gen=++generation.current
    let canceled=false
    queueMicrotask(()=>{
      if(canceled||gen!==generation.current)return
      setLoading(true);setItems([]);setTotal(0);setFailed(false)
    })
    const req={mode,query,playlistId,label,artist}
    void getTracks(req,0).then(page=>{
      if(gen!==generation.current)return
      const lookup=new Map(useLibraryStore.getState().tracks.map(t=>[t.source.path,t]))
      setItems(page.items.map(item=>resolveNativeTrack(item,lookup)))
      setTotal(page.total)
      if(mode==='songs'&&query.trim()&&page.total===0){
        const needle=query.toLowerCase().trim()
        if(useLibraryStore.getState().tracks.some(t=>
          [t.title,t.artist,t.album].some(v=>v?.toLowerCase().includes(needle)))){
          setFailed(true)
        }
      }
    }).catch(()=>{
      if(gen===generation.current)setFailed(true)
    }).finally(()=>{
      if(gen===generation.current)setLoading(false)
    })
    return()=>{canceled=true}
  },[enabled,mode,query,playlistId,label,artist,refreshKey])
  const loadMore=async()=>{
    if(!enabled||failed||loading||moreLoading||items.length>=total)return
    const gen=generation.current
    setMoreLoading(true)
    try{
      const page=await getTracks({mode,query,playlistId,label,artist},items.length)
      if(gen!==generation.current)return
      const lookup=new Map(useLibraryStore.getState().tracks.map(t=>[t.source.path,t]))
      setItems(old=>[...old,...page.items.map(item=>resolveNativeTrack(item,lookup))])
      setTotal(page.total)
    }catch{if(gen===generation.current)setFailed(true)}
    finally{if(gen===generation.current)setMoreLoading(false)}
  }
  return {enabled:enabled&&!failed,items,total,loading,moreLoading,loadMore}
}

export function useNativeGroups(mode:GroupMode,query:string,refreshKey=0){
  const enabled=isTauri()
  const [items,setItems]=useState<NativeGroupSummary[]>([])
  const [total,setTotal]=useState(0)
  const [loading,setLoading]=useState(enabled)
  const [moreLoading,setMoreLoading]=useState(false)
  const [failed,setFailed]=useState(false)
  const generation=useRef(0)
  useEffect(()=>{
    if(!enabled)return
    const gen=++generation.current
    let canceled=false
    queueMicrotask(()=>{
      if(canceled||gen!==generation.current)return
      setItems([]);setTotal(0);setFailed(false);setLoading(true)
    })
    void groupFile(mode,query,0).then(page=>{
      if(gen!==generation.current)return
      setItems(page.items);setTotal(page.total)
    }).catch(()=>{if(gen===generation.current)setFailed(true)})
      .finally(()=>{if(gen===generation.current)setLoading(false)})
    return()=>{generation.current++}
  },[enabled,mode,query,refreshKey])
  const loadMore=async()=>{
    if(!enabled||failed||loading||moreLoading||items.length>=total)return
    const gen=generation.current
    setMoreLoading(true)
    try{
      const page=await groupFile(mode,query,items.length)
      if(gen!==generation.current)return
      setItems(old=>[...old,...page.items]);setTotal(page.total)
    }catch{if(gen===generation.current)setFailed(true)}
    finally{if(gen===generation.current)setMoreLoading(false)}
  }
  return {enabled:enabled&&!failed,items,total,loading,moreLoading,loadMore}
}

export function resolveGroupArtwork(path:string|null){
  return path?convertFileSrc(path):undefined
}

export async function playNativeGroup(mode:'albums'|'artists',
  group:NativeGroupSummary){
  const page=await getTracks({
    mode:mode==='albums'?'album':'artist',label:group.title,
    artist:group.artist,
  },0)
  const lookup=new Map(useLibraryStore.getState().tracks.map(t=>[t.source.path,t]))
  return page.items.map(item=>resolveNativeTrack(item,lookup))
}
