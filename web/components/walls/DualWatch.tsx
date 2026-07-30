'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useFleet } from '@/components/FleetProvider'
import { CameraPane } from '@/components/CameraPane'
import { cn } from '@/lib/utils'

/**
 * Two large CameraPanes side by side. Each pane has a Drone select; `?a=` / `?b=`
 * stay the shareable address (defaults: first two in board order).
 */
export function DualWatch() {
  const search = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
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

  function setSlot(slot: 'a' | 'b', droneId: string) {
    const next = new URLSearchParams(search.toString())
    next.set(slot, droneId)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  if (drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">Waiting for the Fleet.</p>
  }

  const panes = [
    { slot: 'a' as const, drone: left, label: 'Left camera' },
    { slot: 'b' as const, drone: right, label: 'Right camera' },
  ]

  return (
    <div className={cn('grid grid-cols-1 gap-4 min-[48rem]:grid-cols-2')}>
      {panes.map(({ slot, drone, label }) =>
        drone ? (
          <section key={slot} className="flex flex-col gap-2" aria-label={`${drone.name} watch`}>
            <label className="flex flex-col gap-1">
              <span className="sr-only">{label}</span>
              <select
                value={drone.id}
                onChange={(event) => setSlot(slot, event.target.value)}
                aria-label={label}
                className="min-h-11 w-full max-w-md rounded-pill border border-hairline bg-surface-1 px-4 py-1.5 font-display text-value font-medium text-ink"
              >
                {drones.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <CameraPane
              droneId={drone.id}
              droneName={drone.name}
              camera={drone.telemetry?.camera}
              scenarios={scenarios}
            />
          </section>
        ) : (
          <p key={slot} className="m-0 text-body text-ink-muted">
            Pick a second Drone.
          </p>
        ),
      )}
    </div>
  )
}
