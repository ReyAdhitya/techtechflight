import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Clock } from '@techtechflight/contract'
import { FleetBoard } from './components/FleetBoard.tsx'
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

  return <FleetBoard snapshot={snapshot} now={now} />
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
