import { useId, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { DroneState, Status } from '@techtechflight/contract'
import { formatAge, formatExactTime } from '@/lib/age'
import { formatBattery } from '@/lib/battery'
import { STATUS_PRESENTATION, isFixableBeforeTheLesson } from '@/lib/status-presentation'
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
}

/**
 * Everything known about one Drone, so a Teacher can investigate without leaving the
 * board and can read values out to someone technical.
 *
 * Radix Dialog handles focus trapping and Escape, so closing and returning to the Fleet
 * is immediate and never leaves anyone stuck in a sub-screen.
 */
export function DroneDetailDialog({ drone, ageMs, onClose }: DroneDetailDialogProps) {
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

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-surface border border-hairline bg-surface-1 p-6"
          aria-describedby={describedBy}
          ref={contentRef}
          tabIndex={-1}
          /*
           * Focus the dialog itself rather than letting focus land on the first control
           * inside it. That first control is the Last Contact tooltip trigger, and
           * focusing it opens the tooltip — whose own Escape handler would then swallow
           * the key, leaving a Teacher stuck in a sub-screen they pressed Escape to
           * leave. Focusing the container also means a screen reader reads the Drone's
           * name on opening.
           */
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

          {/*
           * Shown whenever the Drone reported one, not only when the Status is Fault.
           * An airborne Drone reads as Flying ahead of any fault it is also reporting,
           * and an Offline one keeps a fault in its last known Telemetry — in both
           * cases this is the detail a Teacher opened the Drone to find.
           */}
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
                'Never heard from'
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

          <Dialog.Close asChild>
            <Button variant="primary" className="self-start">
              Back to the Fleet
            </Button>
          </Dialog.Close>
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
