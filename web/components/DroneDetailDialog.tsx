'use client'

import { useId, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { BatterySample, DroneState, Status } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import { formatAge, formatExactTime } from '@/lib/age'
import { formatBattery, formatTimeToReady } from '@/lib/battery'
import { STATUS_PRESENTATION, isFixableBeforeTheLesson } from '@/lib/status-presentation'
import { formatCoordinates } from '@/lib/vitals-presentation'
import { BatteryChart } from './BatteryChart'
import { CameraPane } from './CameraPane'
import {
  AltitudeAndLanding,
  AttitudeIndicator,
  InstrumentPanel,
} from './FlightInstruments'
import { Button } from './ui/Button'

const STATUS_COLOUR: Record<Status, string> = {
  Ready: 'text-status-ready',
  Flying: 'text-status-flying',
  Offline: 'text-status-offline',
  'Not Ready': 'text-status-not-ready',
  Fault: 'text-status-fault',
}

export interface DroneDetailDialogProps {
  readonly drone: DroneState | null
  readonly ageMs: number | null
  readonly onClose: () => void
  /** Opens the camera slide — watch only; omitted when the host has no slide. */
  readonly onOpenCamera?: () => void
  readonly scenarios?: ScenarioControls | null
  readonly batterySamples?: readonly BatterySample[]
  readonly chartSince?: number
  readonly chartUntil?: number
}

/**
 * Investigate one Drone without leaving the Fleet board.
 *
 * Summary first (Status, contact, battery). Instruments that used to live only on
 * `/drone` sit under **More details** so the board stays the home screen.
 */
export function DroneDetailDialog({
  drone,
  ageMs,
  onClose,
  onOpenCamera,
  scenarios = null,
  batterySamples = [],
  chartSince,
  chartUntil,
}: DroneDetailDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const descriptionId = useId()

  if (!drone) return null

  const presentation = STATUS_PRESENTATION[drone.status]
  const { telemetry } = drone
  const meaningId = `${descriptionId}-meaning`
  const faultId = `${descriptionId}-fault`
  const fixableId = `${descriptionId}-fixable`
  const describedBy = [
    meaningId,
    telemetry?.fault ? faultId : null,
    isFixableBeforeTheLesson(drone.status) ? fixableId : null,
  ]
    .filter(Boolean)
    .join(' ')

  const since = chartSince ?? drone.lastContact ?? 0
  const until = chartUntil ?? drone.lastContact ?? since

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex w-[min(48rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-surface border border-hairline bg-surface-1 p-6"
          aria-describedby={describedBy}
          ref={contentRef}
          tabIndex={-1}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            contentRef.current?.focus()
          }}
        >
          <Dialog.Title className="m-0 font-display text-dialog-title font-medium tracking-[-0.6px]">
            {drone.name}
          </Dialog.Title>

          <div className="flex flex-col gap-1">
            <p
              className={`m-0 text-heading font-medium ${STATUS_COLOUR[drone.status]}`}
              data-status={drone.status}
            >
              {presentation.label}
            </p>
            <p className="m-0 text-body text-ink-muted" id={meaningId}>
              {presentation.meaning}
            </p>
          </div>

          {telemetry?.fault && (
            <p
              className="m-0 border-l-2 border-status-fault pl-3 text-body text-ink"
              id={faultId}
            >
              {telemetry.fault.description} ({telemetry.fault.code})
            </p>
          )}
          {isFixableBeforeTheLesson(drone.status) && (
            <p
              className="m-0 border-l-2 border-status-not-ready pl-3 text-body text-ink"
              data-fixable="true"
              id={fixableId}
            >
              You can put this right before the lesson.
            </p>
          )}

          <dl className="m-0 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-6 gap-y-2 border-t border-hairline pt-4">
            <dt className="label self-center">Last Contact</dt>
            <dd className="tnum m-0 text-value">
              {drone.lastContact === null ? (
                'No response yet'
              ) : (
                <Tooltip.Provider delayDuration={200}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button
                        type="button"
                        className="cursor-help border-b border-dotted border-ink-muted bg-transparent p-0 text-value text-ink"
                      >
                        {formatAge(ageMs ?? 0)}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="tnum z-50 rounded-surface border border-hairline bg-canvas px-2 py-1 text-value text-ink"
                        sideOffset={6}
                      >
                        {formatExactTime(drone.lastContact)}
                        <Tooltip.Arrow className="fill-hairline" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              )}
            </dd>

            {telemetry && (
              <>
                <dt className="label self-center">Battery</dt>
                <dd className="tnum m-0 text-value">
                  {formatBattery(telemetry.batteryFraction)}
                  {telemetry.batteryIsEstimate && ' (estimated)'}
                </dd>

                <dt className="label self-center">Airborne</dt>
                <dd className="m-0 text-value">{telemetry.airborne ? 'Yes' : 'No'}</dd>

                {formatCoordinates(telemetry) && (
                  <>
                    <dt className="label self-center">Position</dt>
                    <dd className="tnum m-0 text-value">{formatCoordinates(telemetry)}</dd>
                  </>
                )}

                {Object.entries(telemetry.extra ?? {}).map(([key, value]) => (
                  <Value key={key} name={key} value={value} />
                ))}
              </>
            )}
          </dl>

          {drone.stale && (
            <p className="m-0 text-value italic text-stale">
              These are the last known values, not current ones.
            </p>
          )}

          {telemetry && (
            <details className="rounded-surface border border-hairline bg-canvas open:pb-3 [&[open]>summary>span:first-child]:rotate-90">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-display text-body font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="text-ink-muted transition-transform" aria-hidden="true">
                  ▸
                </span>
                More details
              </summary>
              <div className="grid gap-4 border-t border-hairline px-4 pt-3 md:grid-cols-2">
                <InstrumentPanel label="Charge">
                  <div className="flex items-baseline gap-3">
                    <span className="tnum font-display text-summary font-medium">
                      {telemetry.batteryIsEstimate ? '~' : ''}
                      {formatBattery(telemetry.batteryFraction)}
                    </span>
                  </div>
                  {drone.timeToReadyMs !== null && (
                    <p className="tnum m-0 text-value text-status-not-ready">
                      {formatTimeToReady(drone.timeToReadyMs)}
                    </p>
                  )}
                  <BatteryChart samples={[...batterySamples]} since={since} until={until} />
                </InstrumentPanel>

                <InstrumentPanel label="Height and landing">
                  <AltitudeAndLanding telemetry={telemetry} />
                </InstrumentPanel>

                <div className="md:col-span-2">
                  <CameraPane
                    droneId={drone.id}
                    droneName={drone.name}
                    camera={telemetry.camera}
                    scenarios={scenarios}
                  />
                </div>

                {telemetry.orientation && (
                  <InstrumentPanel label="How it is sitting">
                    <AttitudeIndicator orientation={telemetry.orientation} />
                  </InstrumentPanel>
                )}
              </div>
            </details>
          )}

          <div className="flex flex-wrap gap-2 self-start">
            {onOpenCamera && (
              <Button type="button" variant="quiet" onClick={onOpenCamera}>
                Camera
              </Button>
            )}
            <Dialog.Close asChild>
              <Button variant="primary">Back to the Fleet</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Value({ name, value }: { name: string; value: string | number | boolean }) {
  return (
    <>
      <dt className="label self-center">{humanise(name)}</dt>
      <dd className="tnum m-0 text-value">{String(value)}</dd>
    </>
  )
}

/** `motorTemperatureC` reads as "Motor temperature C" when spoken aloud. */
function humanise(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}
