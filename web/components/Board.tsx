'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { Clock } from '@techtechflight/contract'
import { SystemClock } from '@techtechflight/contract/testing'
import { FleetConnection, browserSocket, type FleetSnapshot } from '@/lib/fleet-connection'
import { FleetBoard } from './FleetBoard'

/**
 * Before the ground station has sent anything.
 *
 * Rendered on the server and as the first client paint, so the board says it is
 * connecting rather than flashing an empty Fleet — a blank board and a School with no
 * Drones must not look the same for even one frame.
 */
const NOT_YET_CONNECTED: FleetSnapshot = {
  connection: 'connecting',
  state: null,
  receivedAt: null,
}

/**
 * Owns the connection to the ground station.
 *
 * Everything below this is a pure function of a Fleet State and a clock reading, which
 * is what lets the board be driven from fixtures in tests without a socket anywhere
 * near it.
 */
export function Board() {
  const clock = useMemo(() => new SystemClock(), [])

  /*
   * Built lazily rather than at module scope: `browserSocket` closes over `WebSocket`,
   * which does not exist while this page is being prerendered into static HTML.
   */
  const connection = useMemo(
    () => new FleetConnection({ url: fleetUrl(), clock, createSocket: browserSocket }),
    [clock],
  )

  const snapshot = useSyncExternalStore(
    (onChange) => connection.subscribe(onChange),
    () => connection.snapshot,
    // Required under a server render, where there is no connection to read from.
    () => NOT_YET_CONNECTED,
  )
  const now = useNow(clock)

  useEffect(() => {
    connection.start()
    return () => connection.stop()
  }, [connection])

  return <FleetBoard snapshot={snapshot} now={now} />
}

/**
 * Same host as the page by default, so the board follows wherever the ground station is
 * served from. Overridable for a board pointed at a ground station elsewhere.
 */
function fleetUrl(): string {
  const configured = process.env.NEXT_PUBLIC_FLEET_URL
  if (configured) return configured
  /*
   * While the page is being prerendered into static HTML there is no location to follow
   * and no ground station to follow it to. The socket is only ever opened from an
   * effect, which does not run on the server, so this placeholder is never dialled.
   */
  if (typeof location === 'undefined') return ''
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${location.hostname}:4321/fleet`
}

/**
 * A ticking clock reading, so ages on the board keep counting up between snapshots
 * rather than freezing at whatever the last message said.
 *
 * Starts at zero rather than at `clock.now()`: reading the real clock during render
 * would make the server's HTML and the client's first paint disagree. Nothing is shown
 * until a Fleet State arrives, so the placeholder is never on screen.
 */
function useNow(clock: Clock, intervalMs = 1_000): number {
  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(clock.now())
    return clock.setInterval(() => setNow(clock.now()), intervalMs)
  }, [clock, intervalMs])

  return now
}
