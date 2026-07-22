'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { SystemClock } from '@techtechflight/contract/testing'
import { FleetConnection, browserSocket, type FleetSnapshot } from '@/lib/fleet-connection'
import { useDarkTheme, useNow } from './hooks'
import { buildScenario, type ScenarioId } from './scenarios'
import { ShowcaseChrome } from './ShowcaseChrome'
import { ShowcaseFleet } from './ShowcaseFleet'

/**
 * Before anything has been heard from the ground station. Rendered on the server and as
 * the first client paint, so the board says it is connecting rather than flashing an
 * empty Fleet — a blank board and a School with no Drones must not look the same for
 * even one frame.
 */
const NOT_YET_CONNECTED: FleetSnapshot = {
  connection: 'connecting',
  state: null,
  receivedAt: null,
}

/**
 * Owns the connection to the ground station, and the scenario switch.
 *
 * The connection half is the restrained board's `Board.tsx` verbatim in structure — the
 * same `FleetConnection`, the same `FleetSnapshot`, the same ticking clock — because the
 * comparison is only worth anything if both boards are looking at the same data through
 * the same seam. Everything different about this variant is downstream of here.
 */
export function ShowcaseBoard() {
  const clock = useMemo(() => new SystemClock(), [])
  const dark = useDarkTheme()

  /*
   * Built lazily rather than at module scope: `browserSocket` closes over `WebSocket`,
   * which does not exist while this page is being prerendered into static HTML.
   */
  const connection = useMemo(
    () => new FleetConnection({ url: fleetUrl(), clock, createSocket: browserSocket }),
    [clock],
  )

  const live = useSyncExternalStore(
    (onChange) => connection.subscribe(onChange),
    () => connection.snapshot,
    () => NOT_YET_CONNECTED,
  )
  const now = useNow(clock)

  useEffect(() => {
    connection.start()
    return () => connection.stop()
  }, [connection])

  const [scenario, setScenario] = useState<ScenarioId>('live')

  /*
   * Fixture scenarios are anchored to a single timestamp taken when the page mounts, so
   * the ages on screen climb by themselves exactly as a real Fleet State's would. Zero
   * on the server, where there is no clock to read without disagreeing with the client.
   */
  const [anchor, setAnchor] = useState(0)
  useEffect(() => setAnchor(clock.now()), [clock])

  const liveUnavailable = live.state === null
  /*
   * A showcase nobody can open without first starting a ground station would be judged
   * on a skeleton. When Live has nothing to show, the demonstration Fleet stands in —
   * and the bar says which of the two is on screen, because a board that quietly invents
   * Drones is the one failure this whole product exists to avoid.
   */
  const effective: ScenarioId = scenario === 'live' && liveUnavailable ? 'demo' : scenario
  const fixture = anchor === 0 ? null : buildScenario(effective, anchor)
  const snapshot = fixture ?? live

  return (
    <>
      <ShowcaseChrome
        scenario={scenario}
        onScenario={setScenario}
        liveUnavailable={liveUnavailable}
      />
      <ShowcaseFleet snapshot={snapshot} now={now} dark={dark} />
    </>
  )
}

/**
 * Same host as the page by default, so the showcase follows wherever the ground station
 * is served from — identical to the restrained board's rule.
 */
function fleetUrl(): string {
  const configured = process.env.NEXT_PUBLIC_FLEET_URL
  if (configured) return configured
  if (typeof location === 'undefined') return ''
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${location.hostname}:4321/fleet`
}
