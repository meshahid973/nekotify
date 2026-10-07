import { RouterProvider } from 'react-router-dom'

import { ErrorBoundary } from '@/app/ErrorBoundary'
import { router } from '@/app/router'

export function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}
