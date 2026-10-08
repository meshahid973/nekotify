import { invoke, isTauri } from '@tauri-apps/api/core'
import { create } from 'zustand'

export interface Playlist {
  id: number
  name: string
  trackPaths: string[]
}

interface NativeCollections {
  favorites: string[]
  playlists: Playlist[]
}

interface CollectionsState extends NativeCollections {
  busy: boolean
  error: string | null
  refresh: () => Promise<void>
  toggleFavorite: (path: string) => Promise<void>
  createPlaylist: (name: string) => Promise<void>
  deletePlaylist: (playlistId: number) => Promise<void>
  addToPlaylist: (playlistId: number, path: string) => Promise<void>
  removeFromPlaylist: (playlistId: number, path: string) => Promise<void>
}

type Command = 'get_collections' | 'toggle_favorite' | 'create_playlist' |
  'delete_playlist' | 'add_to_playlist' | 'remove_from_playlist'

async function call(command: Command, args?: Record<string, string | number>): Promise<NativeCollections> {
  return invoke<NativeCollections>(command, args)
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export const useCollectionsStore = create<CollectionsState>((set) => {
  const perform = async (command: Command, args?: Record<string, string | number>) => {
    if (!isTauri()) return
    set({ busy: true, error: null })
    try {
      const result = await call(command, args)
      set({ ...result, busy: false, error: null })
    } catch (error) {
      set({ busy: false, error: message(error) })
    }
  }
  return {
    favorites: [], playlists: [], busy: false, error: null,
    refresh: () => perform('get_collections'),
    toggleFavorite: (path) => perform('toggle_favorite', { path }),
    createPlaylist: (name) => perform('create_playlist', { name }),
    deletePlaylist: (playlistId) => perform('delete_playlist', { playlistId }),
    addToPlaylist: (playlistId, path) => perform('add_to_playlist', { playlistId, path }),
    removeFromPlaylist: (playlistId, path) => perform('remove_from_playlist', { playlistId, path }),
  }
})
