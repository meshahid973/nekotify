import { convertFileSrc, invoke, isTauri } from '@tauri-apps/api/core'
import type { NativeLibraryTrack } from '@/features/library/library.types'
import type { Track } from '@/types/media'

export interface NativeTrackPage {
  items: NativeLibraryTrack[]
  total: number
  offset: number
  limit: number
}

/** The native query service owns ranking and pagination. Client only resolves
 * returned rows against currently playing/queued track identities. */
export async function nativeTrackSearch(query:string,offset=0,limit=80):Promise<NativeTrackPage>{
  if (!isTauri()) return {items:[],total:0,offset,limit}
  return invoke<NativeTrackPage>('search_library',{query,offset,limit})
}

export function resolveNativeTrack(native:NativeLibraryTrack,byPath:Map<string,Track>):Track {
  const known=byPath.get(native.path)
  if(known)return known
  return {
    id:native.id,title:native.title,artist:native.artist,
    album:native.album ?? undefined,duration:native.duration,
    source:{kind:'local',path:native.path,uri:convertFileSrc(native.path)},
    artwork:native.artworkPath?{
      path:native.artworkPath,uri:convertFileSrc(native.artworkPath),
      alt:native.title+' artwork',
    }:undefined,
    artworkKind:native.artworkPath?'local':'fallback',
  }
}
