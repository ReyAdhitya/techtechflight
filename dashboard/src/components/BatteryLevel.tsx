import * as Progress from '@radix-ui/react-progress'
import type { Telemetry } from '@techtechflight/contract'
import { formatBattery } from '../battery.ts'

export interface BatteryLevelProps {
  readonly telemetry: Telemetry
  /** Stale readings are shown faded, and read out as last known rather than current. */
  readonly stale: boolean
  /**
   * Whether this charge is short of flying a lesson.
   *
   * Passed in from the derived Status rather than compared against a threshold here.
   * The ground station alone decides what counts as enough battery, and a second copy
   * of that number in the dashboard would drift the moment either changed.
   */
  readonly low: boolean
}

/**
 * Battery as a proportion, so a Teacher never has to know what a usable voltage is.
 *
 * Radix Progress is used for the correct progressbar role and value semantics — this is
 * one of the few places the board needs real behaviour rather than plain markup.
 */
export function BatteryLevel({ telemetry, stale, low }: BatteryLevelProps) {
  const percent = Math.round(telemetry.batteryFraction * 100)
  const reading = formatBattery(telemetry.batteryFraction)

  const description = [
    stale ? 'Last known battery' : 'Battery',
    telemetry.batteryIsEstimate ? `${reading}, estimated` : reading,
  ].join(' ')

  return (
    <div className="battery" data-stale={stale || undefined}>
      <Progress.Root className="battery__track" value={percent} max={100} aria-label={description}>
        <Progress.Indicator
          className="battery__fill"
          style={{ width: `${percent}%` }}
          data-low={low || undefined}
        />
      </Progress.Root>
      <span className="battery__reading" aria-hidden="true">
        {/* The tilde is the visible cue that the hardware cannot measure this precisely. */}
        {telemetry.batteryIsEstimate ? `~${reading}` : reading}
      </span>
    </div>
  )
}
