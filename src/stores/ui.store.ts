import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UiDensity = 'comfortable' | 'compact'
export type MotionPreference = 'system' | 'reduced'

interface UiState {
  density: UiDensity
  motionPreference: MotionPreference
  setDensity: (density: UiDensity) => void
  setMotionPreference: (preference: MotionPreference) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      density: 'comfortable',
      motionPreference: 'system',
      setDensity: (density) => set({ density }),
      setMotionPreference: (motionPreference) => set({ motionPreference }),
    }),
    {
      name: 'nekotify-ui',
      version: 2,
      partialize: ({ density, motionPreference }) => ({
        density,
        motionPreference,
      }),
    },
  ),
)
