import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

import { Button } from '@/components/primitives/Button'

import './ErrorBoundary.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nekotify render failure', error, info)
  }

  private reload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main className="error-boundary">
        <section className="error-boundary__panel">
          <p className="eyebrow">Nekotify</p>
          <h1>Something interrupted the interface.</h1>
          <p>
            Your local files were not changed. Reload the window to restart the
            interface.
          </p>
          <Button onClick={this.reload}>Reload Nekotify</Button>
        </section>
      </main>
    )
  }
}
