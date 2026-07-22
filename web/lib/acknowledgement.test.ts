import { beforeEach, describe, expect, it } from 'vitest'
import { AcknowledgementTracker } from './acknowledgement'
import { alertQueue, type AlertKind, type AlertSeverity, type DroneVitals, type VitalsAlert } from './vitals'

/**
 * Working the queue down.
 *
 * What is worth testing hardest is not that an Alert disappears — it is the three ways it
 * has to come back, because a queue that only empties is one a Teacher stops trusting the
 * moment something they dismissed turns out to still be happening.
 */

const anAlert = (
  kind: AlertKind,
  severity: AlertSeverity = 'warning',
  since = 1_000,
): VitalsAlert => ({ kind, severity, text: `something about ${kind}`, since })

const aDrone = (droneId: string, alerts: readonly VitalsAlert[]): DroneVitals => ({
  droneId,
  callsign: droneId,
  status: 'Flying',
  phase: 'level',
  airborne: true,
  altitudeM: 1,
  verticalRateMps: 0,
  batteryFraction: 0.5,
  enduranceMs: null,
  responseAgeMs: 500,
  position: { eastM: 0, northM: 0 },
  separationM: null,
  conflictWith: null,
  alerts,
})

let taken: AcknowledgementTracker

beforeEach(() => {
  taken = new AcknowledgementTracker()
})

const queueOf = (vitals: readonly DroneVitals[]) =>
  alertQueue(vitals, (droneId, alert) => taken.isTaken(droneId, alert))

describe('taking an Alert', () => {
  it('removes it from the queue', () => {
    const fleet = [aDrone('ttf-0001', [anAlert('obstacle')])]
    expect(queueOf(fleet)).toHaveLength(1)

    taken.acknowledge('ttf-0001', anAlert('obstacle'), 2_000)

    expect(queueOf(fleet)).toHaveLength(0)
  })

  it('leaves every other Alert alone, including the same kind on another Drone', () => {
    const fleet = [
      aDrone('ttf-0001', [anAlert('obstacle')]),
      aDrone('ttf-0002', [anAlert('obstacle')]),
    ]

    taken.acknowledge('ttf-0001', anAlert('obstacle'), 2_000)

    expect(queueOf(fleet).map((alert) => alert.droneId)).toEqual(['ttf-0002'])
  })

  it('remembers when it was taken, for saying so on the Drone’s own strip', () => {
    taken.acknowledge('ttf-0001', anAlert('obstacle'), 2_000)

    expect(taken.takenAt('ttf-0001', anAlert('obstacle'))).toBe(2_000)
  })
})

describe('the ways a taken Alert comes back', () => {
  it('returns when the same condition gets worse', () => {
    const warning = [aDrone('ttf-0001', [anAlert('separation', 'warning')])]
    taken.acknowledge('ttf-0001', anAlert('separation', 'warning'), 2_000)
    expect(queueOf(warning)).toHaveLength(0)

    // Two Drones drifting closer is not the thing that was dealt with a minute ago.
    const critical = [aDrone('ttf-0001', [anAlert('separation', 'critical')])]

    expect(queueOf(critical)).toHaveLength(1)
  })

  it('stays taken when the same condition eases', () => {
    taken.acknowledge('ttf-0001', anAlert('separation', 'critical'), 2_000)

    const easier = [aDrone('ttf-0001', [anAlert('separation', 'warning')])]

    expect(queueOf(easier)).toHaveLength(0)
  })

  it('returns when the condition clears and later happens again', () => {
    const faulting = [aDrone('ttf-0001', [anAlert('fault', 'critical')])]
    taken.acknowledge('ttf-0001', anAlert('fault', 'critical'), 2_000)
    expect(queueOf(faulting)).toHaveLength(0)

    // Fixed: nothing is wrong with it any more, so the board forgets it was ever dealt with.
    taken.observe([aDrone('ttf-0001', [])])
    expect(taken.size).toBe(0)

    // And an hour later it faults again. New news, not old business.
    expect(queueOf(faulting)).toHaveLength(1)
  })
})

describe('what acknowledging does not do', () => {
  it('leaves the Drone’s own Alerts exactly as they were', () => {
    const fleet = [aDrone('ttf-0001', [anAlert('obstacle'), anAlert('low-endurance')])]

    taken.acknowledge('ttf-0001', anAlert('obstacle'), 2_000)

    // The queue stops asking; the strip still says what is true. A Teacher having seen a
    // problem is not the same as the problem having stopped.
    expect(fleet[0]?.alerts).toHaveLength(2)
  })

  it('does not touch a condition nobody has taken', () => {
    const fleet = [aDrone('ttf-0001', [anAlert('obstacle'), anAlert('low-endurance')])]

    taken.acknowledge('ttf-0001', anAlert('obstacle'), 2_000)

    expect(queueOf(fleet).map((alert) => alert.kind)).toEqual(['low-endurance'])
  })
})
