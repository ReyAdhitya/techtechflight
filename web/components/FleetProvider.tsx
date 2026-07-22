'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import type { Clock, DroneState } from '@techtechflight/contract'
import { SystemClock } from '@techtechflight/contract/testing'
import { FleetConnection, browserSocket } from '@/lib/fleet-connection'
import type { FleetLink, FleetSnapshot } from '@/lib/fleet-link'
import { LocalFleetLink } from '@/lib/local-fleet-link'

/**
 * One connection to the ground station, shared by every screen.
 *
 * Before this, the board was the only screen and owned its own socket. With a timeline,
 * a lesson, and a per-Drone view all reading the same Fleet, a socket per page would
 * mean the ground station serving four copies of the same thing to one Teacher — and,
 * worse, four screens that could disagree during a reconnect.
 */

export interface FleetView {
  readonly snapshot: FleetSnapshot
  /** The browser's clock, ticking, so ages stay honest between snapshots. */
  readonly now: number
  /** True when the Fleet on screen is a stand-in rather than one a ground station sent. */
  readonly demo: boolean
}

const FleetContext = createContext<FleetView | null>(null)

export function useFleet(): FleetView {
  const view = useContext(FleetContext)
  if (!view) throw new Error('useFleet must be used inside a FleetProvider')
  return view
}

/** The Drones on screen, or an empty Fleet before the first Fleet State arrives. */
export function useDrones(): readonly DroneState[] {
  return useFleet().snapshot.state?.drones ?? []
}

const NOT_YET_CONNECTED: FleetSnapshot = {
  connection: 'connecting',
  state: null,
  receivedAt: null,
  history: null,
}

/**
 * True when this build has no ground station to reach at all.
 *
 * Set at build time for the standalone deploy (see `vercel.json`). A build served by the
 * ground station itself never sets it, so the copy that goes to a school is untouched
 * and still waits honestly for real Telemetry.
 */
function builtForDemoOnly(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_ONLY === '1'
}

/**
 * The one place in the product that knows whether a Fleet is simulated.
 *
 * Everything downstream reads a FleetSnapshot and cannot tell, which is the point of the
 * seam. `demo` travels on the view for one reason only: so the header can say so in
 * words. No screen may branch on it to behave differently.
 */
export function FleetProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const demo = builtForDemoOnly() || pathname.startsWith('/demo')
  const clock = useMemo(() => new SystemClock(), [])

  /*
   * Built lazily rather than at module scope. `browserSocket` closes over `WebSocket`,
   * which does not exist while these pages are being prerendered into static HTML — and
   * a local Fleet must not start ticking during a build either. Neither does anything
   * until `start`, below, which only ever runs on a client.
   */
  const link = useMemo<FleetLink>(
    () =>
      demo
        ? new LocalFleetLink({ clock })
        : new FleetConnection({ url: fleetUrl(), clock, createSocket: browserSocket }),
    [clock, demo],
  )

  const snapshot = useSyncExternalStore(
    (onChange) => link.subscribe(onChange),
    () => link.snapshot,
    () => NOT_YET_CONNECTED,
  )
  const now = useNow(clock)

  useEffect(() => {
    link.start()
    return () => link.stop()
  }, [link])

  const view = useMemo<FleetView>(() => ({ snapshot, now, demo }), [snapshot, now, demo])
  return <FleetContext.Provider value={view}>{children}</FleetContext.Provider>
}

/**
 * Same host as the page by default, so the board follows wherever the ground station is
 * served from. Overridable for a board pointed at a ground station elsewhere.
 */
function fleetUrl(): string {
  const configured = process.env.NEXT_PUBLIC_FLEET_URL
  if (configured) return configured
  if (typeof location === 'undefined') return ''
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${location.hostname}:4321/fleet`
}

/**
 * A ticking clock reading, so ages keep counting up between snapshots rather than
 * freezing at whatever the last message said.
 *
 * Starts at zero rather than at `clock.now()`: reading the real clock during render
 * would make the server's HTML and the client's first paint disagree.
 */
function useNow(clock: Clock, intervalMs = 1_000): number {
  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(clock.now())
    return clock.setInterval(() => setNow(clock.now()), intervalMs)
  }, [clock, intervalMs])

  return now
}
