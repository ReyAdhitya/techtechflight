'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useFleet } from '@/components/FleetProvider'
import { CameraPane } from '@/components/CameraPane'
import { cn } from '@/lib/utils'

/**
 * Two large CameraPanes side by side — query `?a=&b=` drone ids, default first two.
 */
export function DualWatch() {
  const search = useSearchParams()
  const { snapshot, scenarios } = useFleet()
  const drones = snapshot.state?.drones ?? []

  const { left, right } = useMemo(() => {
    const a = search.get('a')
    const b = search.get('b')
    const byId = (id: string | null) => (id ? drones.find((d) => d.id === id) : undefined)
    const first = byId(a) ?? drones[0] ?? null
    const second =
      byId(b) ?? drones.find((d) => d.id !== first?.id) ?? drones[1] ?? null
    return { left: first, right: second }
  }, [search, drones])

  if (drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">Waiting for the Fleet.</p>
  }

  return (
    <div className={cn('grid grid-cols-1 gap-4 min-[48rem]:grid-cols-2')}>
      {[left, right].map((drone, index) =>
        drone ? (
          <section key={drone.id} className="flex flex-col gap-2" aria-label={`${drone.name} watch`}>
            <h2 className="m-0 font-display text-body font-medium text-ink">{drone.name}</h2>
            <CameraPane
              droneId={drone.id}
              droneName={drone.name}
              camera={drone.telemetry?.camera}
              scenarios={scenarios}
            />
          </section>
        ) : (
          <p key={index} className="m-0 text-body text-ink-muted">
            Pick a second Drone with ?b=
          </p>
        ),
      )}
    </div>
  )
}
