import { beforeEach, describe, expect, it } from 'vitest'
import type { DroneCommand } from '@techtechflight/contract'
import { CommandTracker, RESPONSE_WINDOW_MS } from './command-tracker'
import type { DroneVitals } from './vitals'

/**
 * Sent, taken, and seen to have happened are three different facts.
 *
 * Everything worth testing here is that they stay three. A board that read "Landed" from a
 * button press would be inventing the one thing a Teacher is standing in the room to check.
 */

const asked = (kind: DroneCommand['kind'], issuedAt = 1_000): DroneCommand => ({
  id: `c-${kind}`,
  droneId: 'ttf-0001',
  kind,
  issuedAt,
})

const flying = (overrides: Partial<DroneVitals> = {}): DroneVitals => ({
  droneId: 'ttf-0001',
  callsign: 'Drone 1',
  status: 'Flying',
  phase: 'climbing',
  airborne: true,
  altitudeM: 2,
  verticalRateMps: 0.8,
  batteryFraction: 0.6,
  enduranceMs: null,
  responseAgeMs: 500,
  position: { eastM: 0, northM: 0 },
  separationM: null,
  conflictWith: null,
  alerts: [],
  ...overrides,
})

let tracker: CommandTracker

beforeEach(() => {
  tracker = new CommandTracker()
})

describe('asking a Drone to land', () => {
  it('is only sent until the Fleet answers', () => {
    tracker.issue(asked('land'))

    expect(tracker.latestFor('ttf-0001')?.stage).toBe('sent')
  })

  it('is waiting once the Fleet takes it — not done', () => {
    tracker.issue(asked('land'))
    tracker.record({ type: 'command-outcome', commandId: 'c-land', outcome: 'accepted', reason: null })

    // The Fleet having accepted it says nothing whatever about the aircraft.
    expect(tracker.latestFor('ttf-0001')?.stage).toBe('waiting')
  })

  it('is done only when Telemetry shows the Drone is down', () => {
    tracker.issue(asked('land'))
    tracker.record({ type: 'command-outcome', commandId: 'c-land', outcome: 'accepted', reason: null })

    tracker.observe([flying()], 2_000)
    expect(tracker.latestFor('ttf-0001')?.stage).toBe('waiting')

    tracker.observe([flying({ airborne: false, phase: 'on-ground', status: 'Ready' })], 3_000)
    expect(tracker.latestFor('ttf-0001')?.stage).toBe('done')
  })

  it('says nothing has been seen rather than that it failed', () => {
    tracker.issue(asked('land'))
    tracker.record({ type: 'command-outcome', commandId: 'c-land', outcome: 'accepted', reason: null })

    tracker.observe([flying()], 1_000 + RESPONSE_WINDOW_MS + 1)

    // A Drone that ignored a request and a Drone that stopped talking are not
    // distinguishable from here, and must not be described as though they were.
    expect(tracker.latestFor('ttf-0001')?.stage).toBe('no-response')
  })
})

describe('a Fleet that will not carry it', () => {
  it('says so, and keeps saying so', () => {
    tracker.issue(asked('land'))
    tracker.record({
      type: 'command-outcome',
      commandId: 'c-land',
      outcome: 'refused',
      reason: 'This Fleet does not accept Commands from the board.',
    })

    expect(tracker.latestFor('ttf-0001')?.stage).toBe('refused')
    expect(tracker.latestFor('ttf-0001')?.reason).toMatch(/does not accept/i)
  })

  it('is not quietly resolved by the Drone happening to land anyway', () => {
    tracker.issue(asked('land'))
    tracker.record({ type: 'command-outcome', commandId: 'c-land', outcome: 'refused', reason: 'no' })

    tracker.observe([flying({ airborne: false, phase: 'on-ground' })], 3_000)

    // A Student landing it by hand is not the Fleet having carried out a Command.
    expect(tracker.latestFor('ttf-0001')?.stage).toBe('refused')
  })
})

describe('the other Commands', () => {
  it('counts a hold as done once the Drone stops going anywhere vertically', () => {
    tracker.issue(asked('hold'))
    tracker.observe([flying()], 2_000)
    expect(tracker.latestFor('ttf-0001')?.stage).toBe('sent')

    tracker.observe([flying({ phase: 'level', verticalRateMps: 0 })], 3_000)
    expect(tracker.latestFor('ttf-0001')?.stage).toBe('done')
  })

  it('counts an emergency stop as done only once it is latched', () => {
    tracker.issue(asked('emergency-stop'))

    tracker.observe([flying({ airborne: false, phase: 'on-ground' })], 2_000)
    // On the ground is not the same as cut. Someone still has to walk over to it.
    expect(tracker.latestFor('ttf-0001')?.stage).toBe('sent')

    tracker.observe([flying({ airborne: false, phase: 'emergency' })], 3_000)
    expect(tracker.latestFor('ttf-0001')?.stage).toBe('done')
  })
})
