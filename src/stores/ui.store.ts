import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UiDensity = 'comfortable' | 'compact'
export type MotionPreference = 'system' | 'reduced'
export type AppTheme = 'oled' | 'ambience'

interface UiState {
  density: UiDensity
  motionPreference: MotionPreference
  theme: AppTheme
  setDensity: (density: UiDensity) => void
  setMotionPreference: (preference: MotionPreference) => void
  setTheme: (theme: AppTheme) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      density: 'comfortable',
      motionPreference: 'system',
      theme: 'oled',
      setDensity: (density) => set({ density }),
      setMotionPreference: (motionPreference) => set({ motionPreference }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'nekotify-ui',
      version: 3,
      partialize: ({ density, motionPreference, theme }) => ({
        density,
        motionPreference,
        theme,
      }),
    },
  ),
)
