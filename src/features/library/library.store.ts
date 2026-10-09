import { convertFileSrc, invoke, isTauri } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { usePlaybackStore } from '@/features/playback/playback.store'
import { notify } from '@/stores/toast.store'

import type {
  NativeArtworkSource,
  NativeLibraryArtwork,
  NativeLibraryFolder,
  NativeLibrarySnapshot,
  NativeLibraryTrack,
} from '@/features/library/library.types'
import type { ArtworkRef, Track } from '@/types/media'

type LibraryStatus = 'idle' | 'loading' | 'ready' | 'error'

interface LibraryState {
  folders: NativeLibraryFolder[]
  artSources: NativeArtworkSource[]
  artworkPool: ArtworkRef[]
  tracks: Track[]
  status: LibraryStatus
  scanning: boolean
  metadataRevision:number
  updateMetadata:(path:string,values:{title:string;artist:string;album:string})=>Promise<boolean>
  cancelScan: () => Promise<void>
  error: string | null
  refresh: () => Promise<void>
  importFolder: () => Promise<void>
  importArtFolder: () => Promise<void>
  importArtFile: () => Promise<void>
  removeFolder: (path: string) => Promise<void>
  removeArtSource: (path: string) => Promise<void>
  setArtwork: (trackPath: string, artworkPath: string | null) => Promise<void>
  reshuffleFallbacks: () => void
}

function mapArtwork(artwork: NativeLibraryArtwork): ArtworkRef {
  return {
    path: artwork.path,
    uri: convertFileSrc(artwork.path),
    alt: artwork.name,
  }
}

const FALLBACK_KEY = 'nekotify-fallback-artwork-v1'

function readFallbacks(): Record<string, string> {
  try {
    const stored = localStorage.getItem(FALLBACK_KEY)
    return stored ? JSON.parse(stored) as Record<string, string> : {}
  } catch {
    return {}
  }
}

function storeFallbacks(assignments: Record<string, string>) {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(assignments))
  } catch {
    // Cache is optional; deterministic assignments still work.
  }
}

function stableIndex(trackId: string, length: number) {
  let hash = 2166136261
  for (let i = 0; i < trackId.length; i += 1) {
    hash = Math.imul(hash ^ trackId.charCodeAt(i), 16777619)
  }
  return (hash >>> 0) % length
}

function mapTrack(
  track: NativeLibraryTrack,
  fallbackArtwork?: ArtworkRef,
): Track {
  const artwork = track.artworkPath
    ? {
        path: track.artworkPath,
        uri: convertFileSrc(track.artworkPath),
        alt: track.title + ' artwork',
      }
    : fallbackArtwork

  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album || undefined,
    duration: track.duration,
    artwork,
    artworkKind: track.artworkPath ? 'local' : 'fallback',
    source: {
      kind: 'local',
      path: track.path,
      uri: convertFileSrc(track.path),
    },
  }
}

function snapshotState(snapshot: NativeLibrarySnapshot) {
  const artworkPool = snapshot.artworkPool.map(mapArtwork).sort(
    (a, b) => (a.path ?? '').localeCompare(b.path ?? ''),
  )
  const assignments = readFallbacks()
  const choices = new Map(artworkPool.map((art) => [art.path, art]))
  const tracks = snapshot.tracks.map((track) => {
    if (track.artworkPath || artworkPool.length === 0) return mapTrack(track)
    const chosen = choices.get(assignments[track.id]) ??
      artworkPool[stableIndex(track.id, artworkPool.length)]
    if (chosen.path) assignments[track.id] = chosen.path
    return mapTrack(track, chosen)
  })
  storeFallbacks(assignments)

  return {
    folders: snapshot.folders,
    artSources: snapshot.artSources,
    artworkPool,
    tracks,
    status: 'ready' as const,
    error: null,
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function invokeSnapshot(
  command:
    | 'load_library'
    | 'remove_music_folder'
    | 'remove_art_source'
    | 'set_track_artwork',
  args?: Record<string, unknown>,
) {
  return invoke<NativeLibrarySnapshot>(command, args)
}

async function invokeOptionalSnapshot(
  command:
    | 'import_music_folder'
    | 'import_art_folder'
    | 'import_art_file',
) {
  return invoke<NativeLibrarySnapshot | null>(command)
}

function synchronizePlayingTrack(tracks: Track[]) {
  const playing = usePlaybackStore.getState().track
  if (!playing) return
  const replacement = tracks.find((track) => track.id === playing.id)
  if (replacement) usePlaybackStore.setState({ track: replacement })
}

export const useLibraryStore = create<LibraryState>((set, get) => ({

  folders: [],
  artSources: [],
  artworkPool: [],
  tracks: [],
  status: 'idle',
  scanning: false,
  metadataRevision:0,
  updateMetadata:async(path,values)=>{
    if(!isTauri())return false
    const before=get().tracks
    const current=usePlaybackStore.getState().track
    const update=(track:Track):Track=>track.source.path===path?{
      ...track,title:values.title.trim(),artist:values.artist.trim(),
      album:values.album.trim()||undefined,
    }:track
    set({tracks:before.map(update)})
    if(current?.source.path===path)usePlaybackStore.setState({track:update(current)})
    try{
      await invoke('set_track_metadata',{path,...values})
      set({metadataRevision:get().metadataRevision+1,error:null})
      notify('Song details saved','success')
      return true
    }catch(error){
      set({tracks:before,error:errorMessage(error)})
      if(current?.source.path===path)usePlaybackStore.setState({track:current})
      notify('Could not save song details; restored previous values','error')
      return false
    }
  },
  cancelScan: async () => {
    if (isTauri()) await invoke('cancel_library_scan')
  },
  error: null,

  refresh: async () => {
    if (get().scanning) return
    if (!isTauri()) {
      set({ status: 'ready', error: null })
      return
    }

    set({scanning:true})
    // Cached metadata is shown before the expensive disk traversal.
    // Keep the previous visible library if a scan fails.
    if (get().status === 'idle') set({ status: 'loading', error: null })
    try {
      const cached = snapshotState(await invoke<NativeLibrarySnapshot>('cached_library'))
      if (get().tracks.length === 0) {
        set(cached)
        synchronizePlayingTrack(cached.tracks)
      }
    } catch {
      // Older indices may be absent; a full scan can still recover the library.
    }
    try {
      const snapshot = snapshotState(await invokeSnapshot('load_library'))
      set(snapshot)
      synchronizePlayingTrack(snapshot.tracks)
    } catch (error) {
      set({ status: get().tracks.length ? 'ready' : 'error',
        error: errorMessage(error) })
    } finally {
      set({ scanning:false })
    }
  },

  importFolder: async () => {
    if (!isTauri()) {
      set({
        status: 'error',
        error: 'Folder import is available in the desktop app.',
      })
      return
    }

    set({ status: 'loading', error: null })

    try {
      const snapshot = await invokeOptionalSnapshot('import_music_folder')
      if (snapshot) {
        const next = snapshotState(snapshot)
        set(next)
        synchronizePlayingTrack(next.tracks)
      } else {
        set({ status: 'ready' })
      }
    } catch (error) {
      set({ status: 'error', error: errorMessage(error) })
    }
  },

  importArtFolder: async () => {
    if (!isTauri()) {
      set({
        status: 'error',
        error: 'Artwork import is available in the desktop app.',
      })
      return
    }

    set({ status: 'loading', error: null })

    try {
      const snapshot = await invokeOptionalSnapshot('import_art_folder')
      if (snapshot) {
        const next = snapshotState(snapshot)
        set(next)
        synchronizePlayingTrack(next.tracks)
      } else {
        set({ status: 'ready' })
      }
    } catch (error) {
      set({ status: 'error', error: errorMessage(error) })
    }
  },

  importArtFile: async () => {
    if (!isTauri()) {
      set({
        status: 'error',
        error: 'Artwork import is available in the desktop app.',
      })
      return
    }

    set({ status: 'loading', error: null })

    try {
      const snapshot = await invokeOptionalSnapshot('import_art_file')
      if (snapshot) {
        const next = snapshotState(snapshot)
        set(next)
        synchronizePlayingTrack(next.tracks)
      } else {
        set({ status: 'ready' })
      }
    } catch (error) {
      set({ status: 'error', error: errorMessage(error) })
    }
  },

  removeFolder: async (path) => {
    if (!isTauri()) {
      return
    }

    set({ status: 'loading', error: null })

    try {
      set(
        snapshotState(
          await invokeSnapshot('remove_music_folder', { path }),
        ),
      )
    } catch (error) {
      set({ status: 'error', error: errorMessage(error) })
    }
  },

  removeArtSource: async (path) => {
    if (!isTauri()) {
      return
    }

    set({ status: 'loading', error: null })

    try {
      set(
        snapshotState(
          await invokeSnapshot('remove_art_source', { path }),
        ),
      )
    } catch (error) {
      set({ status: 'error', error: errorMessage(error) })
    }
  },
  setArtwork: async (trackPath, artworkPath) => {
    if (!isTauri()) return
    set({ status: 'loading', error: null })
    try {
      const snapshot = snapshotState(
        await invokeSnapshot('set_track_artwork', { trackPath, artworkPath }),
      )
      set(snapshot)
      synchronizePlayingTrack(snapshot.tracks)
    } catch (error) {
      set({ status: 'error', error: errorMessage(error) })
    }
  },

  reshuffleFallbacks: () => {
    const pool = get().artworkPool
    if (!pool.length) return
    const assignments = readFallbacks()
    const tracks = get().tracks.map((track) => {
      if (track.artworkKind !== 'fallback') return track
      const picked = pool[Math.floor(Math.random() * pool.length)]
      if (picked.path) assignments[track.id] = picked.path
      return { ...track, artwork: picked }
    })
    storeFallbacks(assignments)
    set({ tracks })
    synchronizePlayingTrack(tracks)
  },

}))
