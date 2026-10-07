import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UiDensity = 'comfortable' | 'compact'
export type MotionPreference = 'system' | 'reduced'

interface UiState {
  sidebarCollapsed: boolean
  density: UiDensity
  motionPreference: MotionPreference
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setDensity: (density: UiDensity) => void
  setMotionPreference: (preference: MotionPreference) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      density: 'comfortable',
      motionPreference: 'system',
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setDensity: (density) => set({ density }),
      setMotionPreference: (motionPreference) => set({ motionPreference }),
    }),
    {
      name: 'nekotify-ui',
      version: 1,
      partialize: ({ sidebarCollapsed, density, motionPreference }) => ({
        sidebarCollapsed,
        density,
        motionPreference,
      }),
    },
  ),
)
