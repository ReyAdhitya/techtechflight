'use client'

import { useSyncExternalStore } from 'react'
import { useFleet } from '@/components/FleetProvider'
import {
  readLogbook,
  readServerLogbook,
  studentOf,
  subscribeLogbook,
} from '@/lib/logbook'
import { WallGrid, WallTile } from './WallGrid'

/**
 * Assignment card for the Classroom Wall — who flies which craft, read across a room.
 *
 * Board order only (DELIBERATE-POSITIONS 1). Student name is the large line; Drone Name
 * sits under it so a Teacher can call either across the class. Unassigned craft say so in
 * words, not by vanishing.
 */
export function AssignmentWall({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const assigned = drones.filter((drone) => studentOf(book, drone.id) !== null).length

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 font-display text-summary font-medium text-ink">
        <span className="tnum">{assigned}</span>
        {' of '}
        <span className="tnum">{drones.length}</span>
        {' assigned'}
      </p>
      <WallGrid>
        {drones.map((drone) => {
          const student = studentOf(book, drone.id)
          return (
            <WallTile key={drone.id} className="min-h-[8rem] justify-center gap-3 p-4">
              {student ? (
                <>
                  <p className="m-0 font-display text-heading font-medium text-ink">{student}</p>
                  <p className="m-0 text-body text-ink-subtle">{drone.name}</p>
                </>
              ) : (
                <>
                  <p className="m-0 font-display text-heading font-medium text-ink-muted">
                    Unassigned
                  </p>
                  <p className="m-0 text-body text-ink-subtle">{drone.name}</p>
                </>
              )}
            </WallTile>
          )
        })}
      </WallGrid>
    </div>
  )
}
