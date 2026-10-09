import { createHashRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

// Keep player and shell resident. Only the selected page is downloaded and
// evaluated at startup; artwork-heavy Library/Settings remain separate chunks.
export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, lazy: async () => ({
          Component: (await import('@/pages/Home/HomePage')).HomePage,
        }) },
      { path:'search', lazy: async () => ({
          Component: (await import('@/pages/Search/SearchPage')).SearchPage,
        }) },
      { path:'library', lazy: async () => ({
          Component: (await import('@/pages/Library/LibraryPage')).LibraryPage,
        }) },
      { path:'settings', lazy: async () => ({
          Component: (await import('@/pages/Settings/SettingsPage')).SettingsPage,
        }) },
    ],
  },
])
