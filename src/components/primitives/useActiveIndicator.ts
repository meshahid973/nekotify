import { useLayoutEffect, useRef } from 'react'

export function useActiveIndicator<T extends HTMLElement>(activeKey: string) {
  const containerRef = useRef<T>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const indicator = indicatorRef.current
    if (!container || !indicator) return

    const active = container.querySelector<HTMLElement>('[data-indicator-active="true"]')
    const update = () => {
      if (!active) {
        indicator.style.opacity = '0'
        return
      }
      const parent = container.getBoundingClientRect()
      const selected = active.getBoundingClientRect()
      const x = selected.left - parent.left + container.scrollLeft
      const y = selected.top - parent.top + container.scrollTop
      indicator.style.width = selected.width + 'px'
      indicator.style.height = selected.height + 'px'
      indicator.style.transform = `translate3d(${x}px,${y}px,0)`
      indicator.style.opacity = '1'
    }

    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const observer = new ResizeObserver(update)
    observer.observe(container)
    if (active) observer.observe(active)
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [activeKey])

  return { containerRef, indicatorRef }
}
