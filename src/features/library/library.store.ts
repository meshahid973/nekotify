import { convertFileSrc, invoke, isTauri } from '@tauri-apps/api/core'
import { create } from 'zustand'

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
  error: string | null
  refresh: () => Promise<void>
  importFolder: () => Promise<void>
  importArtFolder: () => Promise<void>
  importArtFile: () => Promise<void>
  removeFolder: (path: string) => Promise<void>
  removeArtSource: (path: string) => Promise<void>
}

function mapArtwork(artwork: NativeLibraryArtwork): ArtworkRef {
  return {
    path: artwork.path,
    uri: convertFileSrc(artwork.path),
    alt: artwork.name,
  }
}

function shuffleArtwork(items: ArtworkRef[]) {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]

    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }

  return shuffled
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
    source: {
      kind: 'local',
      path: track.path,
      uri: convertFileSrc(track.path),
    },
  }
}

function snapshotState(snapshot: NativeLibrarySnapshot) {
  const artworkPool = shuffleArtwork(snapshot.artworkPool.map(mapArtwork))

  return {
    folders: snapshot.folders,
    artSources: snapshot.artSources,
    artworkPool,
    tracks: snapshot.tracks.map((track, index) =>
      mapTrack(
        track,
        artworkPool.length > 0
          ? artworkPool[index % artworkPool.length]
          : undefined,
      ),
    ),
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
    | 'remove_art_source',
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

export const useLibraryStore = create<LibraryState>((set) => ({
  folders: [],
  artSources: [],
  artworkPool: [],
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
      set(snapshotState(await invokeSnapshot('load_library')))
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
      const snapshot = await invokeOptionalSnapshot('import_music_folder')
      set(snapshot ? snapshotState(snapshot) : { status: 'ready' })
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
      set(snapshot ? snapshotState(snapshot) : { status: 'ready' })
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
      set(snapshot ? snapshotState(snapshot) : { status: 'ready' })
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
}))
