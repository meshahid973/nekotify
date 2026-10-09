import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UiDensity = 'comfortable' | 'compact'
export type MotionPreference = 'system' | 'reduced'
export type AppTheme = 'oled' | 'ambience'

interface UiState {
  density: UiDensity
  motionPreference: MotionPreference
  theme: AppTheme
  quickWheelEnabled: boolean
  sidebarCollapsed: boolean
  sidebarPercent: number
  queuePercent: number
  queueDocked: boolean
  shortcutsOpen:boolean
  setDensity: (density: UiDensity) => void
  setMotionPreference: (preference: MotionPreference) => void
  setTheme: (theme: AppTheme) => void
  setQuickWheelEnabled: (enabled:boolean)=>void
  setSidebarCollapsed: (collapsed:boolean)=>void
  setSidebarPercent: (percent:number)=>void
  setQueuePercent: (percent:number)=>void
  setQueueDocked: (docked:boolean)=>void
  setShortcutsOpen:(open:boolean)=>void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      density: 'comfortable',
      motionPreference: 'system',
      theme: 'oled',
      quickWheelEnabled: false,
      sidebarCollapsed: false,
      sidebarPercent: 21,
      queuePercent: 27,
      queueDocked: true,
      shortcutsOpen:false,
      setDensity: (density) => set({ density }),
      setMotionPreference: (motionPreference) => set({ motionPreference }),
      setTheme: (theme) => set({ theme }),
      setQuickWheelEnabled: (quickWheelEnabled) => set({quickWheelEnabled}),
      setSidebarCollapsed: (sidebarCollapsed) => set({sidebarCollapsed}),
      setSidebarPercent: (sidebarPercent) => set({sidebarPercent:Math.max(12,Math.min(35,sidebarPercent))}),
      setQueuePercent: (queuePercent) => set({queuePercent:Math.max(18,Math.min(38,queuePercent))}),
      setQueueDocked: (queueDocked) => set({queueDocked}),
      setShortcutsOpen:(shortcutsOpen)=>set({shortcutsOpen}),
    }),
    {
      name: 'nekotify-ui',
      version: 3,
      partialize: ({ density, motionPreference, theme, quickWheelEnabled,
        sidebarCollapsed, sidebarPercent, queuePercent, queueDocked }) => ({
        density,
        motionPreference,
        theme,
        quickWheelEnabled,
        sidebarCollapsed, sidebarPercent, queuePercent, queueDocked,
      }),
    },
  ),
)
