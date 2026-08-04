import { describe, expect, it } from 'vitest'
import { EXCEPTION_WORDS, PHASE_WORDS, missionPhaseFor } from './mission-phase.ts'
import type { MissionPhaseInput } from './mission-phase.ts'
import { emptyMission, type Mission, type MissionCheckpoint } from './mission.ts'
import type { DroneVitals } from './vitals.ts'

/**
 * What these pin, above everything else, is that the phase is *derived*.
 *
 * A Command being sent must never move a Drone forward on this list. The whole reason a
 * Teacher can tell an aircraft that obeyed from one that ignored them is that this
 * function refuses to take a request as evidence (ADR-0011, ADR-0020).
 */

const vitals = (overrides: Partial<DroneVitals> = {}): DroneVitals => ({
  droneId: 'ttf-0001',
  callsign: 'Drone 1',
  status: 'Flying',
  phase: 'level',
  airborne: true,
  altitudeM: 1.5,
  verticalRateMps: 0,
  groundSpeedMps: null,
  batteryFraction: 0.7,
  enduranceMs: 600_000,
  responseAgeMs: 1_000,
  position: { eastM: 2, northM: 2 },
  separationM: null,
  conflictWith: null,
  alerts: [],
  ...overrides,
})

const checkpoint = (id: string, eastM: number, northM: number): MissionCheckpoint => ({
  id,
  name: id,
  at: { eastM, northM },
  radiusM: 1,
  required: true,
})

const mission: Mission = {
  ...emptyMission('m1', 'search-rescue', 'Search and Rescue'),
  checkpoints: [checkpoint('a', 2, 2), checkpoint('b', 8, 8)],
}

const input = (overrides: Partial<MissionPhaseInput> = {}): MissionPhaseInput => ({
  vitals: vitals(),
  mission,
  preFlightDone: true,
  cleared: true,
  closingOnHome: null,
  holdRequested: false,
  breaches: [],
  confirmedComplete: false,
  ...overrides,
})

describe('before it flies', () => {
  it('is Standby with no Mission at all', () => {
    const reading = missionPhaseFor(
      input({ mission: null, vitals: vitals({ airborne: false, phase: 'on-ground' }) }),
    )
    expect(reading.phase).toBe('standby')
  })

  it('is Pre-flight once there is a Mission and the check is not done', () => {
    const reading = missionPhaseFor(
      input({
        preFlightDone: false,
        cleared: false,
        vitals: vitals({ airborne: false, phase: 'on-ground' }),
      }),
    )
    expect(reading.phase).toBe('pre-flight')
  })

  it('queues itself for clearance once the check is done', () => {
    /*
     * Nobody pressed anything. This is the whole of the derived takeoff request: the
     * Teacher's queue fills itself from records they already made.
     */
    const reading = missionPhaseFor(
      input({ cleared: false, vitals: vitals({ airborne: false, phase: 'on-ground' }) }),
    )
    expect(reading.phase).toBe('awaiting-clearance')
  })

  it('distinguishes cleared-and-still-on-the-ground from still waiting', () => {
    // The twelfth state. A team that has permission and has not moved is not a team the
    // Teacher still owes an answer to.
    const reading = missionPhaseFor(
      input({ vitals: vitals({ airborne: false, phase: 'on-ground' }) }),
    )
    expect(reading.phase).toBe('cleared')
  })
})

describe('in the air', () => {
  it('is Takeoff while climbing with nothing reached yet', () => {
    const reading = missionPhaseFor(
      input({ vitals: vitals({ phase: 'climbing', position: { eastM: 0, northM: 0 } }) }),
    )
    expect(reading.phase).toBe('takeoff')
  })

  it('counts only the required checkpoints it has actually reached', () => {
    // Sitting on checkpoint a, nowhere near b.
    const reading = missionPhaseFor(input())
    expect(reading.checkpointsReached).toBe(1)
    expect(reading.checkpointsRequired).toBe(2)
    expect(reading.phase).toBe('checkpoint-progress')
  })

  it('is In mission before anything has been reached', () => {
    const reading = missionPhaseFor(
      input({ vitals: vitals({ position: { eastM: 5, northM: 0 } }) }),
    )
    expect(reading.phase).toBe('in-mission')
    expect(reading.checkpointsReached).toBe(0)
  })

  it('is Task complete once every required checkpoint is behind it', () => {
    const single: Mission = { ...mission, checkpoints: [checkpoint('a', 2, 2)] }
    expect(missionPhaseFor(input({ mission: single })).phase).toBe('task-complete')
  })

  it('is Landing when the aircraft is coming down', () => {
    expect(missionPhaseFor(input({ vitals: vitals({ phase: 'descending' }) })).phase).toBe(
      'landing',
    )
  })
})

describe('the rule that a request is not a fact', () => {
  it('does not say Returning just because a Recall was asked for', () => {
    /*
     * The most important test in this file. `closingOnHome` is deliberately not derivable
     * from "the Teacher pressed Recall" — a Drone that was told to come home and is still
     * hovering reads as In mission, which is the only way anyone notices it did not obey.
     */
    const stillHovering = missionPhaseFor(
      input({ closingOnHome: null, vitals: vitals({ position: { eastM: 5, northM: 0 } }) }),
    )
    expect(stillHovering.phase).toBe('in-mission')
  })

  it('says Returning once the aircraft is measurably getting nearer', () => {
    const onItsWay = missionPhaseFor(
      input({ closingOnHome: true, vitals: vitals({ position: { eastM: 5, northM: 0 } }) }),
    )
    expect(onItsWay.phase).toBe('returning')
  })

  it('does not say Returning when the track says it is going the other way', () => {
    const wandering = missionPhaseFor(
      input({ closingOnHome: false, vitals: vitals({ position: { eastM: 5, northM: 0 } }) }),
    )
    expect(wandering.phase).toBe('in-mission')
  })
})

describe('when it goes quiet', () => {
  it('keeps where it had got to rather than inventing a new state', () => {
    /*
     * Falling back to Standby would say a Drone that is probably still airborne is on the
     * bench. The last thing anybody knew is still the last thing anybody knew.
     */
    const reading = missionPhaseFor(
      input({ vitals: vitals({ phase: 'no-contact' }), lastKnown: 'checkpoint-progress' }),
    )
    expect(reading.phase).toBe('checkpoint-progress')
    expect(reading.exception).toBe('lost-link')
  })

  it('says Standby only when there is genuinely nothing to remember', () => {
    const reading = missionPhaseFor(input({ vitals: vitals({ phase: 'no-contact' }) }))
    expect(reading.phase).toBe('standby')
  })
})

describe('exceptions ride on the phase rather than replacing it', () => {
  it('keeps the Mission position while out of bounds', () => {
    const reading = missionPhaseFor(
      input({
        breaches: [{ kind: 'entered-no-fly', zoneId: 'z', zoneName: 'the netting' }],
      }),
    )
    // Still on task — and that is what makes it obvious where it resumes.
    expect(reading.phase).toBe('checkpoint-progress')
    expect(reading.exception).toBe('no-fly')
  })

  it('puts being out of bounds above a low charge', () => {
    // The customer's safety priorities: airspace rules outrank aircraft recovery.
    const reading = missionPhaseFor(
      input({
        breaches: [{ kind: 'left-mission-zone', zoneId: 'z', zoneName: 'the hall' }],
        vitals: vitals({
          alerts: [
            { kind: 'low-endurance', severity: 'warning', text: 'Land now.', since: 0 },
          ],
        }),
      }),
    )
    expect(reading.exception).toBe('no-fly')
  })

  it('reports an obstacle as avoiding', () => {
    const reading = missionPhaseFor(
      input({
        vitals: vitals({
          alerts: [{ kind: 'obstacle', severity: 'warning', text: 'Something close.', since: 0 }],
        }),
      }),
    )
    expect(reading.exception).toBe('avoiding')
  })

  it('is quiet when nothing is wrong', () => {
    expect(missionPhaseFor(input()).exception).toBeNull()
  })
})

describe('what a Teacher reads', () => {
  it('gives every phase and every exception a word', () => {
    // Colour is never the sole carrier of meaning (ADR-0004), so every one needs a word.
    for (const word of Object.values(PHASE_WORDS)) expect(word).toMatch(/^[A-Z]/)
    for (const word of Object.values(EXCEPTION_WORDS)) expect(word).toMatch(/^[A-Z]/)
  })

  it('confirms the Mission is over only when the Teacher said so', () => {
    expect(missionPhaseFor(input({ confirmedComplete: true })).phase).toBe('finished')
  })
})
