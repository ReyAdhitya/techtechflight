'use client'

import { useSyncExternalStore } from 'react'
import { useFleet } from './FleetProvider'
import { FleetAllWellLine } from './FleetAllWellLine'
import { FleetBoard } from './FleetBoard'
import { MissingCraftNotice } from './MissingCraftNotice'
import { SpareNomination } from './SpareNomination'
import { WhatNeedsDoing } from './MaintenanceScreen'
import { lastClosedLesson } from '@/lib/missing-craft'
import { readLogbook, readServerLogbook, subscribeLogbook } from '@/lib/logbook'
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
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const drones = snapshot.state?.drones ?? []
  return (
    <>
      <FleetBoard
        snapshot={snapshot}
        now={now}
        demo={demo}
        scenarios={scenarios}
      />
      <div className={cn(INSTRUMENT_FRAME, 'flex flex-col gap-6 px-4 pb-8 min-[26rem]:px-8')}>
        {drones.length > 0 && (
          <section className="flex flex-col gap-4">
            <FleetAllWellLine drones={drones} />
            <MissingCraftNotice
              lastClosedLesson={lastClosedLesson(book.lessons)}
              drones={drones}
            />
            <SpareNomination drones={drones} />
          </section>
        )}
        <WhatNeedsDoing />
      </div>
    </>
  )
}
