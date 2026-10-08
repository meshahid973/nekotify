import { create } from 'zustand'

type OpenPanel = 'queue' | 'now-playing' | null

interface PlayerPanelsState {
  openPanel: OpenPanel
  setPanel: (panel: OpenPanel) => void
  togglePanel: (panel: Exclude<OpenPanel, null>) => void
}

export const usePlayerPanelsStore = create<PlayerPanelsState>((set, get) => ({
  openPanel: null,
  setPanel: (openPanel) => set({ openPanel }),
  togglePanel: (panel) => set({ openPanel: get().openPanel === panel ? null : panel }),
}))
