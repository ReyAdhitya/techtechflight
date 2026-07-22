'use client'

import { useFleet } from './FleetProvider'
import { FleetBoard } from './FleetBoard'

/** The board, reading the connection the group's layout holds. */
export function FleetScreen() {
  const { snapshot, now, demo } = useFleet()
  return <FleetBoard snapshot={snapshot} now={now} demo={demo} />
}
