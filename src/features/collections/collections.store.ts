import { invoke, isTauri } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { notify } from '@/stores/toast.store'

export interface Playlist { id:number;name:string;trackPaths:string[] }
interface NativeCollections { favorites:string[];playlists:Playlist[] }
interface CollectionsState extends NativeCollections {
  busy:boolean;error:string|null;revision:number
  refresh:()=>Promise<void>
  toggleFavorite:(path:string)=>Promise<void>
  createPlaylist:(name:string)=>Promise<void>
  deletePlaylist:(playlistId:number)=>Promise<void>
  addToPlaylist:(playlistId:number,path:string)=>Promise<void>
  removeFromPlaylist:(playlistId:number,path:string)=>Promise<void>
}
type Command='get_collections'|'toggle_favorite'|'create_playlist'|
  'delete_playlist'|'add_to_playlist'|'remove_from_playlist'
type Patch=(state:NativeCollections)=>NativeCollections
interface Pending {id:number;patch:Patch}

const call=(command:Command,args?:Record<string,string|number>)=>
  invoke<NativeCollections>(command,args)
const message=(error:unknown)=>error instanceof Error?error.message:String(error)

/** Persist changes in order and reapply still-pending optimistic actions to
 * each authoritative Rust response. A slow write cannot erase a later click. */
export const useCollectionsStore=create<CollectionsState>((set)=>{
  let committed:NativeCollections={favorites:[],playlists:[]}
  let pending:Pending[]=[]
  let serial=0
  let revision=0
  let inFlight=0
  let chain:Promise<void>=Promise.resolve()
  const project=()=>pending.reduce((state,op)=>op.patch(state),committed)
  const publish=(error:string|null=null)=>{
    set({...project(),busy:inFlight>0,error,revision:++revision})
  }
  const perform=async(command:Command,args?:Record<string,string|number>,patch?:Patch)=>{
    if(!isTauri())return
    const id=++serial
    if(patch)pending=[...pending,{id,patch}]
    inFlight++
    publish()
    const request=chain.then(()=>call(command,args))
    chain=request.then(()=>undefined,()=>undefined)
    try {
      committed=await request
      pending=pending.filter(op=>op.id!==id)
      inFlight--
      publish()
    } catch(error) {
      pending=pending.filter(op=>op.id!==id)
      inFlight--
      const description=message(error)
      publish(description)
      notify('Could not save change. Previous state restored.','error')
    }
  }
  return {
    ...committed,busy:false,error:null,revision:0,
    refresh:()=>perform('get_collections'),
    toggleFavorite:(path)=>perform('toggle_favorite',{path},state=>({
      ...state,
      favorites:state.favorites.includes(path)
        ?state.favorites.filter(p=>p!==path):[...state.favorites,path],
    })),
    createPlaylist:(name)=>{
      const clean=name.trim()
      if(!clean)return Promise.resolve()
      const temporary=-serial-1
      return perform('create_playlist',{name:clean},state=>({
        ...state,playlists:[...state.playlists,
          {id:temporary,name:clean,trackPaths:[]}],
      }))
    },
    deletePlaylist:(playlistId)=>perform('delete_playlist',{playlistId},state=>({
      ...state,playlists:state.playlists.filter(p=>p.id!==playlistId),
    })),
    addToPlaylist:(playlistId,path)=>perform('add_to_playlist',{playlistId,path},state=>({
      ...state,playlists:state.playlists.map(p=>p.id!==playlistId||
        p.trackPaths.includes(path)?p:{
          ...p,trackPaths:[...p.trackPaths,path],
        }),
    })),
    removeFromPlaylist:(playlistId,path)=>perform('remove_from_playlist',
      {playlistId,path},state=>({
        ...state,playlists:state.playlists.map(p=>p.id!==playlistId?p:{
          ...p,trackPaths:p.trackPaths.filter(x=>x!==path),
        }),
      })),
  }
})
