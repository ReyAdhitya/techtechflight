import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Clock } from '@techtechflight/contract'
import { FleetBoard } from './components/FleetBoard.tsx'
import { SiteHeader } from './components/SiteHeader.tsx'
import type { FleetConnection } from './fleet-connection.ts'

export interface AppProps {
  readonly connection: FleetConnection
  readonly clock: Clock
}

export function App({ connection, clock }: AppProps) {
  const snapshot = useSyncExternalStore(
    (onChange) => connection.subscribe(onChange),
    () => connection.snapshot,
  )
  const now = useNow(clock)

  useEffect(() => {
    connection.start()
    return () => connection.stop()
  }, [connection])

  /*
   * Identity and the room controls travel together in one bar above the Fleet. Both
   * describe the room rather than the Drones, which is why they sit outside the board —
   * and why a first Tab still lands on a Drone rather than on a control nobody touches
   * mid-lesson.
   */
  return (
    <>
      <SiteHeader />
      <FleetBoard snapshot={snapshot} now={now} />
    </>
  )
}

/**
 * A ticking clock reading, so ages on the board keep counting up between snapshots
 * rather than freezing at whatever the last message said.
 */
function useNow(clock: Clock, intervalMs = 1_000): number {
  const [now, setNow] = useState(() => clock.now())

  useEffect(() => clock.setInterval(() => setNow(clock.now()), intervalMs), [clock, intervalMs])

  return now
}
