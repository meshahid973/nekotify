import { create } from 'zustand'

interface CoverPickerState {
  trackPath: string | null
  open: (trackPath: string) => void
  close: () => void
}

export const useCoverPickerStore = create<CoverPickerState>((set) => ({
  trackPath: null,
  open: (trackPath) => set({ trackPath }),
  close: () => set({ trackPath: null }),
}))
