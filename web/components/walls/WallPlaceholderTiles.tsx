'use client'

import { useFleet } from '@/components/FleetProvider'
import { WallGrid, WallTile } from './WallGrid'

/**
 * Named placeholders for a wall that does not yet show vitals or cameras.
 * Same board order as Control strips (`FleetState.drones` / vitals).
 */
export function WallPlaceholderTiles({ emptyLabel = 'Waiting for the Fleet.' }: { emptyLabel?: string }) {
  const { snapshot, vitals } = useFleet()
  const drones = snapshot.state?.drones

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  return (
    <WallGrid>
      {vitals.map((entry) => {
        const drone = drones.find((d) => d.id === entry.droneId)
        const name = drone?.name ?? entry.droneId
        return (
          <WallTile key={entry.droneId}>
            <p className="m-0 font-display text-body font-medium text-ink">{name}</p>
            <p className="m-0 text-caption text-ink-subtle">Placeholder</p>
          </WallTile>
        )
      })}
    </WallGrid>
  )
}
