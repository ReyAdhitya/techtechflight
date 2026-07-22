'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Clock, DroneId, DroneState } from '@techtechflight/contract'
import { readServerTheme, readTheme, subscribeTheme } from '@/lib/theme'

/**
 * The theme, read from the same `<html data-theme>` attribute the restrained board uses.
 *
 * Shared deliberately: the 3D materials have to agree with the CSS, and a showcase with
 * its own private theme state would drift from the toggle the moment either changed.
 */
export function useDarkTheme(): boolean {
  return useSyncExternalStore(subscribeTheme, readTheme, readServerTheme) === 'dark'
}

/**
 * A ticking clock reading, so ages keep counting up between Fleet States.
 *
 * Starts at zero rather than at `clock.now()` for the same reason the restrained board
 * does: reading the real clock during render would make the prerendered HTML and the
 * first client paint disagree.
 */
export function useNow(clock: Clock, intervalMs = 1_000): number {
  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(clock.now())
    return clock.setInterval(() => setNow(clock.now()), intervalMs)
  }, [clock, intervalMs])

  return now
}

/**
 * Which Drones have just changed Status.
 *
 * The choreography this drives is the strongest argument the maximalist board has: a
 * Teacher looking at the room rather than the board gets a flash in peripheral vision
 * at the moment a Drone changes, which the restrained board can only offer as a colour
 * settling over 400ms.
 *
 * The first Fleet State seeds the map without flashing anything — a board opened onto a
 * Fleet that already has two Faults must sit still, or the cue means "here is a Drone"
 * rather than "this Drone just changed".
 */
export function useStatusChanges(
  drones: readonly DroneState[],
  holdMs = 1_400,
): ReadonlySet<DroneId> {
  const previous = useRef(new Map<DroneId, DroneState['status']>())
  const [changed, setChanged] = useState<ReadonlySet<DroneId>>(() => new Set())

  useEffect(() => {
    const justChanged = new Set<DroneId>()
    for (const drone of drones) {
      const before = previous.current.get(drone.id)
      if (before !== undefined && before !== drone.status) justChanged.add(drone.id)
      previous.current.set(drone.id, drone.status)
    }
    if (justChanged.size === 0) return

    setChanged((current) => new Set([...current, ...justChanged]))
    const handle = setTimeout(() => {
      setChanged((current) => {
        const next = new Set(current)
        for (const id of justChanged) next.delete(id)
        return next
      })
    }, holdMs)
    return () => clearTimeout(handle)
  }, [drones, holdMs])

  return changed
}

/**
 * Whether the heavy parts of the page may mount yet.
 *
 * The 3D stage is deferred behind one paint so the Fleet — the thing a Teacher came for
 * — is on screen before the renderer starts compiling shaders. It is the one piece of
 * the maximalist build that is unambiguously an improvement over loading it eagerly.
 */
export function useDeferredMount(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return ready
}
