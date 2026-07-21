import { useState } from 'react'
import type { DroneId, DroneState } from '@techtechflight/contract'
import type { FleetSnapshot } from '../fleet-connection.ts'
import { ageMs } from '../age.ts'
import { ConnectionBanner } from './ConnectionBanner.tsx'
import { DroneDetailDialog } from './DroneDetailDialog.tsx'
import { DroneTile } from './DroneTile.tsx'
import { FleetSummary } from './FleetSummary.tsx'

export interface FleetBoardProps {
  readonly snapshot: FleetSnapshot
  /** The browser's clock, ticking, so ages stay honest between snapshots. */
  readonly now: number
}

/**
 * The whole Fleet on one screen.
 *
 * Tiles are laid out in the ground station's board order and never reorder as Status
 * changes, so position is learnable. Drones needing attention are separated by how they
 * look — colour, shape, and word — rather than by moving, because a tile that jumps
 * when a battery dips destroys the muscle memory the ordering exists to build.
 */
export function FleetBoard({ snapshot, now }: FleetBoardProps) {
  const [openDroneId, setOpenDroneId] = useState<DroneId | null>(null)
  const { state, receivedAt } = snapshot

  if (!state || receivedAt === null) {
    return (
      <main className="board board--empty">
        <ConnectionBanner connection={snapshot.connection} />
      </main>
    )
  }

  const age = (drone: DroneState) => ageMs(drone, state, receivedAt, now)
  const openDrone = state.drones.find((drone) => drone.id === openDroneId) ?? null

  return (
    <main className="board">
      <ConnectionBanner connection={snapshot.connection} />
      <FleetSummary drones={state.drones} />

      <ul className="board__grid">
        {state.drones.map((drone) => (
          <li key={drone.id}>
            <DroneTile
              drone={drone}
              ageMs={age(drone)}
              onOpenDetail={() => setOpenDroneId(drone.id)}
            />
          </li>
        ))}
      </ul>

      <DroneDetailDialog
        drone={openDrone}
        ageMs={openDrone ? age(openDrone) : null}
        onClose={() => setOpenDroneId(null)}
      />
    </main>
  )
}
