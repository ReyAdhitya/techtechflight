'use client'

import { useState } from 'react'
import { useFleet } from './FleetProvider'
import { CameraSlide } from './CameraSlide'
import { FleetBoard } from './FleetBoard'
import { WhatNeedsDoing } from './MaintenanceScreen'
import { cn } from '@/lib/utils'
import { INSTRUMENT_FRAME } from '@/lib/frame'

/**
 * The board, and what needs doing to it.
 *
 * Two halves of one question. The tiles say what every Drone is; the list underneath says
 * what to do about the ones that are not, in the order they can be acted on. Both are
 * about the Fleet right now, which is why they belong on the same screen — the list used
 * to sit on Maintenance beside a question about the past, which is a different moment in
 * a Teacher's day entirely.
 */
export function FleetScreen() {
  const { snapshot, now, demo, scenarios } = useFleet()
  const [cameraDroneId, setCameraDroneId] = useState<string | null>(null)
  const cameraDrone =
    cameraDroneId === null
      ? null
      : (snapshot.state?.drones.find((drone) => drone.id === cameraDroneId) ?? null)

  return (
    <>
      <FleetBoard
        snapshot={snapshot}
        now={now}
        demo={demo}
        scenarios={scenarios}
        onOpenCamera={setCameraDroneId}
      />
      <div className={cn(INSTRUMENT_FRAME, 'px-4 pb-8 min-[26rem]:px-8')}>
        <WhatNeedsDoing />
      </div>
      {cameraDrone && (
        <CameraSlide
          droneId={cameraDrone.id}
          droneName={cameraDrone.name}
          camera={cameraDrone.telemetry?.camera}
          scenarios={scenarios}
          onClose={() => setCameraDroneId(null)}
        />
      )}
    </>
  )
}
