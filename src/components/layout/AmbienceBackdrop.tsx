import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

import './AmbienceBackdrop.css'

export function AmbienceBackdrop({
  artwork, active,
}: { artwork?: string; active: boolean }) {
  const [current, setCurrent] = useState<string | undefined>(artwork)
  const [previous, setPrevious] = useState<string | undefined>()

  useEffect(() => {
    if (artwork === current) return
    setPrevious(current)
    setCurrent(artwork)
  }, [artwork, current])

  useEffect(() => {
    if (!previous) return
    const timeout = window.setTimeout(() => setPrevious(undefined), 520)
    return () => window.clearTimeout(timeout)
  }, [current, previous])

  if (!active || (!current && !previous)) return null

  const layerStyle = (url: string): CSSProperties => ({
    backgroundImage: `url("${url}")`,
  })

  return (
    <div className="ambience-backdrop" aria-hidden="true">
      {previous ? (
        <div className="ambience-backdrop__image"
          style={layerStyle(previous)}/>
      ) : null}
      {current ? (
        <div key={current} className="ambience-backdrop__image ambience-backdrop__image--incoming"
          style={layerStyle(current)}/>
      ) : null}
      <div className="ambience-backdrop__shade"/>
    </div>
  )
}
