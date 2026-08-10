'use client'

import dynamic from 'next/dynamic'
import { motion, useReducedMotion } from 'motion/react'
import type { DroneState } from '@techtechflight/contract'
import { isUsable, needsAttention } from '@techtechflight/contract'
import { formatAge } from '@/lib/age'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { AnimatedNumber } from './AnimatedNumber'
import { useDeferredMount } from './hooks'
import { Badge } from './ui/badge'
import { Skeleton } from './ui/skeleton'

/*
 * The renderer is the single heaviest thing on this page, so it is split out of the
 * main chunk and never server-rendered — there is no WebGL context during a static
 * export, and prerendering it would only move the cost, not remove it.
 */
const DroneStage = dynamic(() => import('./DroneStage').then((module) => module.DroneStage), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 rounded-[var(--sc-radius)]" />,
})

export interface FleetOverviewProps {
  readonly drones: readonly DroneState[]
  readonly focus: DroneState | null
  readonly focusAgeMs: number | null
  readonly dark: boolean
}

/**
 * The answer to the only question a Teacher actually has, and a portrait of the Drone
 * that most needs a decision.
 *
 * The count is the heading, exactly as on the restrained board — a status board has no
 * headline above it, because a Teacher opening this is asking precisely this question.
 */
export function FleetOverview({ drones, focus, focusAgeMs, dark }: FleetOverviewProps) {
  const reduced = useReducedMotion()
  const stageReady = useDeferredMount()

  const usable = drones.filter((drone) => isUsable(drone.status)).length
  const attention = drones.filter((drone) => needsAttention(drone.status)).length
  const flying = drones.filter((drone) => drone.status === 'Flying').length

  return (
    <motion.section
      className="sc-glass grid grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)]"
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col justify-between gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[length:var(--sc-text-hero)] font-semibold leading-[1.02] tracking-[-0.035em]">
            <AnimatedNumber value={usable} className="sc-tnum" />
            <span className="text-[length:var(--sc-text-hero-unit)] font-medium tracking-[-0.01em] text-[var(--sc-ink-muted)]">
              of {drones.length} Ready to hand out
            </span>
          </h1>

          {/*
           * The truthful, un-animated statement of the same fact. The rolling digits
           * above are `aria-hidden`, so nothing assistive ever hears a count the Fleet
           * has never actually been in.
           */}
          <p className="sc-visually-hidden" role="status">
            {usable} of {drones.length} Drones Ready to hand out. {attention}{' '}
            {attention === 1 ? 'needs' : 'need'} attention. {flying} flying.
          </p>

          <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
            <CountChip
              value={attention}
              label={attention === 1 ? 'needs attention' : 'need attention'}
              status={attentionTone(drones)}
            />
            {flying > 0 && <CountChip value={flying} label="flying" status="Flying" />}
          </div>
        </div>

        {focus && (
          <div className="flex flex-col gap-2">
            <span className="sc-label">On the stage</span>
            <div className="flex flex-wrap items-center gap-3">
              <strong className="text-lg font-semibold">{focus.name}</strong>
              <Badge status={focus.status} />
              <span className="sc-tnum text-sm text-[var(--sc-ink-muted)]">
                {focus.lastContact === null
                  ? 'No response yet'
                  : `Response ${formatAge(focusAgeMs ?? 0)}`}
              </span>
            </div>
            <p className="m-0 max-w-[46ch] text-sm text-[var(--sc-ink-muted)]">
              {STATUS_PRESENTATION[focus.status].meaning}
            </p>
          </div>
        )}
      </div>

      <div className="sc-stage" data-status={focus?.status ?? 'Offline'}>
        {focus ? (
          stageReady ? (
            <DroneStage drone={focus} dark={dark} />
          ) : (
            <Skeleton className="absolute inset-0 rounded-[var(--sc-radius)]" />
          )
        ) : (
          <p className="sc-stage__fallback">No Drone to show.</p>
        )}

        {/*
         * The legend. A 3D object that encodes five facts and explains none of them is
         * decoration; naming the mapping is what makes it an instrument.
         */}
        {focus && (
          <p className="sc-stage__legend">
            Height and rotors show airborne, tint and beacon show Status, the arc is
            battery, a Stale reading fades
          </p>
        )}
      </div>
    </motion.section>
  )
}

function CountChip({
  value,
  label,
  status,
}: {
  readonly value: number
  readonly label: string
  readonly status: DroneState['status']
}) {
  return (
    <span className="sc-chip" data-status={status}>
      <AnimatedNumber value={value} className="sc-tnum" />
      {label}
    </span>
  )
}

/**
 * How loudly the Needs Attention count should speak.
 *
 * Kept from the restrained board because the distinction is real and survives the
 * restyle: amber is a Teacher with charging to do, coral is a Drone leaving the set.
 */
function attentionTone(drones: readonly DroneState[]): DroneState['status'] {
  if (drones.some((drone) => drone.status === 'Fault')) return 'Fault'
  if (drones.some((drone) => needsAttention(drone.status))) return 'Not Ready'
  return 'Offline'
}
