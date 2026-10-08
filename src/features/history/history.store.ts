import { invoke, isTauri } from '@tauri-apps/api/core'
import { create } from 'zustand'

interface HistoryState {
  recentPaths: string[]
  refresh: () => Promise<void>
  record: (path: string) => Promise<void>
}

export const useHistoryStore = create<HistoryState>((set) => ({
  recentPaths: [],
  refresh: async () => {
    if (!isTauri()) return
    try {
      set({ recentPaths: await invoke<string[]>('get_recent') })
    } catch { /* Listening history is non-critical. */ }
  },
  record: async (path) => {
    if (!isTauri()) return
    try {
      set({ recentPaths: await invoke<string[]>('record_listen', { path }) })
    } catch { /* Playback must never depend on the history database. */ }
  },
}))
