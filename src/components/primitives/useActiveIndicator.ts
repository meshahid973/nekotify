import { animate, useMotionValue, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef } from 'react'

import { useUiStore } from '@/stores/ui.store'

const SPRING = { type: 'spring', stiffness: 420, damping: 28, mass: 0.6 } as const

/** Animates one measured selection surface without animating every nav item. */
export function useActiveIndicator<T extends HTMLElement>(activeKey: string) {
  const containerRef = useRef<T>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const hasPosition = useRef(false)
  const systemReduced = useReducedMotion()
  const preference = useUiStore((state) => state.motionPreference)
  const reduced = Boolean(systemReduced) || preference === 'reduced'

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const width = useMotionValue(0)
  const height = useMotionValue(0)
  const opacity = useMotionValue(0)

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    let animations: Array<{ stop: () => void }> = []

    const update = () => {
      animations.forEach((control) => control.stop())
      animations = []

      const active = container.querySelector<HTMLElement>('[data-indicator-active="true"]')
      if (!active) {
        opacity.set(0)
        return
      }
      const parent = container.getBoundingClientRect()
      const rect = active.getBoundingClientRect()
      const values = [
        [x, rect.left - parent.left + container.scrollLeft],
        [y, rect.top - parent.top + container.scrollTop],
        [width, rect.width],
        [height, rect.height],
      ] as const

      if (reduced || !hasPosition.current) {
        values.forEach(([mv, next]) => mv.set(next))
      } else {
        values.forEach(([mv, next]) => animations.push(animate(mv, next, SPRING)))
      }
      opacity.set(1)
      hasPosition.current = true
    }

    update()
    const active = container.querySelector<HTMLElement>('[data-indicator-active="true"]')
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(container)
    if (active) observer?.observe(active)
    window.addEventListener('resize', update)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
      animations.forEach((control) => control.stop())
    }
  }, [activeKey, reduced, x, y, width, height, opacity])

  return {
    containerRef,
    indicatorRef,
    indicatorStyle: { x, y, width, height, opacity },
  }
}
