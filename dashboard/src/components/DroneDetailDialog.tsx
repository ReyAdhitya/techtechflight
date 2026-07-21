import { useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { DroneState } from '@techtechflight/contract'
import { formatAge, formatExactTime } from '../age.ts'
import { formatBattery } from '../battery.ts'
import { STATUS_PRESENTATION, isFixableBeforeTheLesson } from '../status-presentation.ts'

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

  if (!drone) return null

  const presentation = STATUS_PRESENTATION[drone.status]
  const { telemetry } = drone

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog__overlay" />
        <Dialog.Content
          className="dialog__content"
          aria-describedby={undefined}
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
          <Dialog.Title className="dialog__title">{drone.name}</Dialog.Title>

          <p className="dialog__status" data-status={drone.status}>
            {presentation.label}
          </p>
          <p className="dialog__meaning">{presentation.meaning}</p>

          {/*
            * Shown whenever the Drone reported one, not only when the Status is Fault.
            * An airborne Drone reads as Flying ahead of any fault it is also reporting,
            * and an Offline one keeps a fault in its last known Telemetry — in both
            * cases this is the detail a Teacher opened the Drone to find.
            */}
          {telemetry?.fault && (
            <p className="dialog__fault">
              {telemetry.fault.description} ({telemetry.fault.code})
            </p>
          )}
          {isFixableBeforeTheLesson(drone.status) && (
            <p className="dialog__fault" data-fixable="true">
              You can put this right before the lesson.
            </p>
          )}

          <dl className="dialog__values">
            <dt>Last Contact</dt>
            <dd>
              {drone.lastContact === null ? (
                'Never heard from'
              ) : (
                <Tooltip.Provider delayDuration={200}>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <button type="button" className="dialog__exact">
                        {formatAge(ageMs ?? 0)}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="tooltip" sideOffset={6}>
                        {formatExactTime(drone.lastContact)}
                        <Tooltip.Arrow className="tooltip__arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Tooltip.Provider>
              )}
            </dd>

            {telemetry && (
              <>
                <dt>Battery</dt>
                <dd>
                  {formatBattery(telemetry.batteryFraction)}
                  {telemetry.batteryIsEstimate && ' (estimated)'}
                </dd>

                <dt>Airborne</dt>
                <dd>{telemetry.airborne ? 'Yes' : 'No'}</dd>

                {Object.entries(telemetry.extra ?? {}).map(([key, value]) => (
                  <Value key={key} name={key} value={value} />
                ))}
              </>
            )}
          </dl>

          {drone.stale && (
            <p className="dialog__stale">
              These are the last known values, not current ones.
            </p>
          )}

          <Dialog.Close className="button button--primary">Back to the Fleet</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Value({ name, value }: { name: string; value: string | number | boolean }) {
  return (
    <>
      <dt>{humanise(name)}</dt>
      <dd>{String(value)}</dd>
    </>
  )
}

/** `motorTemperatureC` reads as "Motor temperature C" when spoken aloud. */
function humanise(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}
