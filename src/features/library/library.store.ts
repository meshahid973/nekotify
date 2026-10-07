import { convertFileSrc, invoke, isTauri } from '@tauri-apps/api/core'
import { create } from 'zustand'

import type {
  NativeLibraryFolder,
  NativeLibrarySnapshot,
  NativeLibraryTrack,
} from '@/features/library/library.types'
import type { Track } from '@/types/media'

type LibraryStatus = 'idle' | 'loading' | 'ready' | 'error'

interface LibraryState {
  folders: NativeLibraryFolder[]
  tracks: Track[]
  status: LibraryStatus
  error: string | null
  refresh: () => Promise<void>
  importFolder: () => Promise<void>
  removeFolder: (path: string) => Promise<void>
}

function mapTrack(track: NativeLibraryTrack): Track {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album || undefined,
    duration: track.duration,
    artwork: track.artworkPath
      ? {
          path: track.artworkPath,
          uri: convertFileSrc(track.artworkPath),
          alt: track.title + ' artwork',
        }
      : undefined,
    source: {
      kind: 'local',
      path: track.path,
      uri: convertFileSrc(track.path),
    },
  }
}

function snapshotState(snapshot: NativeLibrarySnapshot) {
  return {
    folders: snapshot.folders,
    tracks: snapshot.tracks.map(mapTrack),
    status: 'ready' as const,
    error: null,
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export const useLibraryStore = create<LibraryState>((set) => ({
  folders: [],
  tracks: [],
  status: 'idle',
  error: null,

  refresh: async () => {
    if (!isTauri()) {
      set({ status: 'ready', error: null })
      return
    }

    set({ status: 'loading', error: null })

    try {
      const snapshot = await invoke<NativeLibrarySnapshot>('load_library')
      set(snapshotState(snapshot))
    } catch (error) {
      set({ status: 'error', error: errorMessage(error) })
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
      const snapshot = await invoke<NativeLibrarySnapshot | null>(
        'import_music_folder',
      )

      if (snapshot) {
        set(snapshotState(snapshot))
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
      const snapshot = await invoke<NativeLibrarySnapshot>(
        'remove_music_folder',
        { path },
      )
      set(snapshotState(snapshot))
    } catch (error) {
      set({ status: 'error', error: errorMessage(error) })
    }
  },
}))
