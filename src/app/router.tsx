import { createHashRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { HomePage } from '@/pages/Home/HomePage'
import { LibraryPage } from '@/pages/Library/LibraryPage'
import { SearchPage } from '@/pages/Search/SearchPage'
import { SettingsPage } from '@/pages/Settings/SettingsPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
