'use client'

import dynamic from 'next/dynamic'
import { useRef } from 'react'
import type { DroneState } from '@techtechflight/contract'
import { formatAge, formatExactTime } from '@/lib/age'
import { formatBattery, formatTimeToReady } from '@/lib/battery'
import { STATUS_PRESENTATION, isFixableBeforeTheLesson } from '@/lib/status-presentation'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from './ui/dialog'
import { Skeleton } from './ui/skeleton'

const DroneStage = dynamic(() => import('./DroneStage').then((module) => module.DroneStage), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 rounded-[var(--sc-radius)]" />,
})

export interface DroneDetailPanelProps {
  readonly drone: DroneState | null
  readonly ageMs: number | null
  readonly dark: boolean
  readonly onClose: () => void
}

/**
 * Everything known about one Drone, so a Teacher can investigate without leaving the
 * board and can read values out to somebody technical.
 *
 * Radix Dialog keeps focus trapping, Escape and the scroll lock. Focus is moved to the
 * panel itself rather than the first control inside it, so a screen reader reads the
 * Drone's name on opening and Escape is not swallowed by whatever happened to be first.
 */
export function DroneDetailPanel({ drone, ageMs, dark, onClose }: DroneDetailPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  if (!drone) return null

  const presentation = STATUS_PRESENTATION[drone.status]
  const { telemetry } = drone

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay className="sc-overlay" />
        <DialogContent
          className="sc-dialog"
          aria-describedby={undefined}
          ref={contentRef}
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            contentRef.current?.focus()
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DialogTitle className="m-0 text-[1.75rem] font-semibold tracking-[-0.03em]">
              {drone.name}
            </DialogTitle>
            <Badge status={drone.status} />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
            <div className="sc-stage" data-status={drone.status}>
              <DroneStage drone={drone} dark={dark} compact />
            </div>

            <div className="flex flex-col gap-4">
              <p className="m-0 text-[0.9375rem] text-[var(--sc-ink-muted)]">
                {presentation.meaning}
              </p>

              {/*
               * Shown whenever the Drone reported one, not only when the Status is
               * Fault: an airborne Drone reads as Flying ahead of any fault it is also
               * reporting, and an Offline one keeps a fault in its last known Telemetry.
               */}
              {telemetry?.fault && (
                <p className="sc-note" data-tone="fault">
                  {telemetry.fault.description} ({telemetry.fault.code})
                </p>
              )}

              {isFixableBeforeTheLesson(drone.status) && (
                <p className="sc-note" data-tone="not-ready" data-fixable="true">
                  You can put this right before the lesson.
                  {drone.timeToReadyMs !== null && ` ${formatTimeToReady(drone.timeToReadyMs)}.`}
                </p>
              )}

              <dl className="m-0 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-6 gap-y-2.5 border-t border-[var(--sc-line)] pt-4">
                <Row label="Last Contact">
                  {drone.lastContact === null
                    ? 'No response yet'
                    : `${formatAge(ageMs ?? 0)} · ${formatExactTime(drone.lastContact)}`}
                </Row>

                {telemetry && (
                  <>
                    <Row label="Battery">
                      {formatBattery(telemetry.batteryFraction)}
                      {telemetry.batteryIsEstimate && ' (estimated)'}
                    </Row>
                    <Row label="Airborne">{telemetry.airborne ? 'Yes' : 'No'}</Row>
                    {Object.entries(telemetry.extra ?? {}).map(([key, value]) => (
                      <Row key={key} label={humanise(key)}>
                        {String(value)}
                      </Row>
                    ))}
                  </>
                )}
              </dl>

              {drone.stale && (
                <p className="m-0 text-sm italic text-[var(--sc-ink-muted)]">
                  These are the last known values, not current ones.
                </p>
              )}
            </div>
          </div>

          <DialogClose asChild>
            <Button variant="solid" className="self-start">
              Back to the Fleet
            </Button>
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <>
      <dt className="sc-label self-center">{label}</dt>
      <dd className="sc-tnum m-0 text-[0.9375rem]">{children}</dd>
    </>
  )
}

/** `motorTemperatureC` reads as "Motor temperature c" when spoken aloud. */
function humanise(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}
