'use client'

import { useFleet } from './FleetProvider'
import { FleetBoard } from './FleetBoard'

/**
 * The board.
 *
 * Headcount, missing lists, spare nomination and the maintenance queue used to stack under
 * the tiles (#624). The tiles already answer what every Drone is; the rest was a second
 * screen of prep the Teacher did not ask for on this route.
 */
export function FleetScreen() {
  const { snapshot, now, demo, scenarios } = useFleet()

  return (
    <FleetBoard
      snapshot={snapshot}
      now={now}
      demo={demo}
      scenarios={scenarios}
    />
  )
}
