import type { MotorReading, Orientation, Telemetry } from '@techtechflight/contract'
import {
  AUTO_LANDING_PRESENTATION,
  describeProximity,
  formatAltitude,
  formatDegrees,
  formatHeading,
  formatThrust,
} from '@/lib/telemetry-presentation'
import { cn } from '@/lib/utils'

/**
 * The readings the aircraft sends, drawn so a Teacher can act on them.
 *
 * Everything here obeys the board's founding rule: a reading the Drone cannot take is
 * said in words rather than drawn as a zero. An airframe with no rangefinder and one
 * that sees clear air are different facts and are never given the same picture.
 */

export function InstrumentPanel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-4">
      <h3 className="label m-0">{label}</h3>
      {children}
    </section>
  )
}

/**
 * How the airframe is sitting, from behind.
 *
 * A horizon that rolls and a nose that pitches, because two numbers in degrees do not
 * tell a Teacher whether a Drone is about to tip over and a picture does immediately.
 */
export function AttitudeIndicator({ orientation }: { orientation: Orientation }) {
  const { pitchDegrees, rollDegrees, yawDegrees } = orientation
  // Pitch shifts the horizon; a quarter-unit per degree keeps sane angles on screen.
  const shift = Math.max(-14, Math.min(14, pitchDegrees * 0.5))

  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox="-24 -24 48 48"
        className="size-24 flex-none overflow-hidden rounded-full border border-hairline"
        role="img"
        aria-label={`Pitch ${formatDegrees(pitchDegrees)}, roll ${formatDegrees(
          rollDegrees,
        )}, heading ${formatHeading(yawDegrees)}`}
      >
        <g transform={`rotate(${-rollDegrees}) translate(0 ${shift})`}>
          <rect x="-40" y="-40" width="80" height="40" className="fill-ink/8" />
          <rect x="-40" y="0" width="80" height="40" className="fill-ink/20" />
          <line x1="-40" x2="40" y1="0" y2="0" className="stroke-ink" strokeWidth="1.2" />
        </g>
        {/* The airframe reference stays fixed while the world moves behind it. */}
        <g className="stroke-status-not-ready" strokeWidth="2" strokeLinecap="round">
          <line x1="-12" x2="-4" y1="0" y2="0" />
          <line x1="4" x2="12" y1="0" y2="0" />
        </g>
        <circle r="1.6" className="fill-status-not-ready" />
      </svg>

      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="label self-center">Pitch</dt>
        <dd className="tnum m-0 text-value">{formatDegrees(pitchDegrees)}</dd>
        <dt className="label self-center">Roll</dt>
        <dd className="tnum m-0 text-value">{formatDegrees(rollDegrees)}</dd>
        <dt className="label self-center">Heading</dt>
        <dd className="tnum m-0 text-value">{formatHeading(yawDegrees)}</dd>
      </dl>
    </div>
  )
}

/**
 * Thrust per motor, laid out where the motors actually are.
 *
 * A list of four percentages makes a Teacher work out which corner is which. An X of
 * four bars means an uneven one is seen rather than read — and an uneven one is the
 * shape of a motor about to fail.
 */
export function MotorThrust({ motors }: { motors: readonly MotorReading[] }) {
  if (motors.length === 0) {
    return <p className="m-0 text-value text-ink-subtle">This Drone reports no per-motor thrust.</p>
  }

  const highest = Math.max(...motors.map((motor) => motor.thrustFraction))
  const lowest = Math.min(...motors.map((motor) => motor.thrustFraction))
  // Only meaningful once something is actually turning.
  const uneven = highest > 0 && highest - lowest > 0.25

  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0">
        {motors.map((motor) => (
          <li key={motor.id} className="flex flex-col gap-1">
            <span className="label">{motor.id.replace(/-/g, ' ')}</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-hairline">
                <div
                  className={cn(
                    'h-full rounded-pill',
                    motor.thrustFraction === 0 ? 'bg-transparent' : 'bg-ink',
                  )}
                  style={{ width: `${Math.round(motor.thrustFraction * 100)}%` }}
                />
              </div>
              <span className="tnum text-value font-medium">
                {formatThrust(motor.thrustFraction)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {uneven && (
        <p className="m-0 border-l-2 border-status-not-ready pl-3 text-value text-ink">
          The motors are working unevenly. Worth a look before it goes out again.
        </p>
      )}
    </div>
  )
}

/**
 * How close the nearest thing is.
 *
 * Three outcomes, drawn as three different things: no sensor at all says so in words,
 * clear air is stated plainly, and something close is the one case that takes colour.
 */
export function ObstacleReading({ telemetry }: { telemetry: Telemetry }) {
  const proximity = describeProximity(telemetry.proximity)

  if (!proximity.fitted) {
    return <p className="m-0 text-value text-ink-subtle">{proximity.text}</p>
  }

  return (
    <p
      className={cn(
        'm-0 text-value',
        proximity.close ? 'border-l-2 border-status-fault pl-3 font-medium text-ink' : 'text-ink',
      )}
      data-close={proximity.close || undefined}
    >
      {proximity.close ? `Too close — ${proximity.text}` : proximity.text}
    </p>
  )
}

/** Height, and whether the Drone can bring itself down from it. */
export function AltitudeAndLanding({ telemetry }: { telemetry: Telemetry }) {
  const autoLanding = telemetry.autoLanding
  const landing = autoLanding ? AUTO_LANDING_PRESENTATION[autoLanding] : null

  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
      <dt className="label self-center">Altitude</dt>
      <dd className="tnum m-0 text-value">
        {telemetry.altitudeM === undefined
          ? 'Not reported'
          : /*
             * "On the ground" is an interpretation, and it is only true when the Drone
             * is not flying. A Drone a second into its climb reads 0.0 m, and saying it
             * was on the ground beside a Status of Flying made the panel contradict
             * itself in front of a Teacher.
             */
            telemetry.airborne
            ? `${(telemetry.altitudeM ?? 0).toFixed(1)} m`
            : formatAltitude(telemetry.altitudeM)}
      </dd>

      <dt className="label self-center">Auto-landing</dt>
      <dd className="m-0 flex flex-col gap-0.5">
        <span
          className={cn(
            'text-value',
            autoLanding === 'in-progress' && 'font-medium text-status-not-ready',
          )}
        >
          {landing?.label ?? 'Not reported'}
        </span>
        {landing && <span className="text-value text-ink-subtle">{landing.meaning}</span>}
      </dd>
    </dl>
  )
}

/**
 * The emergency cut-out, when it is latched.
 *
 * Loud on purpose, and the only element on any screen allowed to be. A cut Drone is not
 * a Drone with a slightly worse Status — it is one nobody should walk up to without
 * knowing why it stopped.
 */
export function EmergencyStopNotice({ telemetry }: { telemetry: Telemetry }) {
  if (!telemetry.emergencyStopTriggered) return null

  return (
    <p
      className="m-0 flex flex-col gap-1 rounded-surface border-2 border-status-fault bg-surface-1 p-4"
      role="alert"
      data-emergency-stop="true"
    >
      <strong className="text-heading font-medium text-status-fault">
        Emergency stop is held
      </strong>
      <span className="text-value text-ink">
        The motors are cut and will stay cut. Someone has to go to this Drone and release
        it before it can fly again.
      </span>
    </p>
  )
}
