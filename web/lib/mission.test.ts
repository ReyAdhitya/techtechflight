import { describe, expect, it } from 'vitest'
import { emptyMission, hasReached, isReadyToFly, whatIsMissing } from './mission.ts'
import type { Mission, MissionCheckpoint } from './mission.ts'
import type { Zone } from './airspace.ts'

/**
 * A Mission is a record the Teacher writes, so what these pin is mostly about *saying what
 * is missing* rather than about arithmetic. A screen that reports "not ready" and nothing
 * else is the thing this product exists not to be, and the only way to keep that true is
 * to make the reasons the return value.
 */

const missionZone: Zone = {
  id: 'z',
  kind: 'no-fly',
  name: 'the hall',
  points: [
    { eastM: 0, northM: 0 },
    { eastM: 8, northM: 0 },
    { eastM: 8, northM: 6 },
    { eastM: 0, northM: 6 },
  ],
}

const checkpoint: MissionCheckpoint = {
  id: 'c1',
  name: 'the far corner',
  at: { eastM: 6, northM: 4 },
  radiusM: 1,
  required: true,
}

const ready = (overrides: Partial<Mission> = {}): Mission => ({
  ...emptyMission('m1', 'search-rescue', 'Search and Rescue'),
  zones: [missionZone],
  checkpoints: [checkpoint],
  droneIds: ['ttf-0001'],
  ...overrides,
})

describe('a Mission that has just been picked', () => {
  it('starts with nothing decided and no outcome', () => {
    const mission = emptyMission('m1', 'delivery', 'Delivery')
    expect(mission.zones).toEqual([])
    expect(mission.startedAt).toBeNull()
    expect(mission.outcome).toBeNull()
  })

  it('says both things it still needs, not just the first', () => {
    /*
     * Both at once, deliberately. A Teacher with a class waiting should read the whole list
     * and clear it in one pass, rather than discovering a second requirement after
     * satisfying the first.
     *
     * It used to be three. *Draw the Mission Zone* went with the go-area (ADR-0027), and no
     * No-fly Zone was asked for in its place: a room with nothing to stay out of is a real
     * room, and a requirement a Teacher cannot satisfy is worse than no requirement.
     */
    const missing = whatIsMissing(emptyMission('m1', 'delivery', 'Delivery'))
    expect(missing).toHaveLength(2)
    expect(missing.join(' ')).toMatch(/checkpoint or a target/)
    expect(missing.join(' ')).toMatch(/Drone/)
  })

  it('asks in sentences a Teacher can act on', () => {
    for (const reason of whatIsMissing(emptyMission('m1', 'delivery', 'Delivery'))) {
      // Every one says what to do, which is the same rule every Alert already follows.
      expect(reason).toMatch(/^(Draw|Add|Assign)/)
      expect(reason).toMatch(/\.$/)
    }
  })
})

describe('whether a Mission can fly', () => {
  it('is ready with a zone, something to do, and a Drone', () => {
    expect(whatIsMissing(ready())).toEqual([])
    expect(isReadyToFly(ready())).toBe(true)
  })

  it('accepts a target instead of a checkpoint', () => {
    // Search and Rescue is looking for something rather than flying a route.
    const searching = ready({
      checkpoints: [],
      targets: [{ id: 't', name: 'the casualty', at: null, detectionLabel: 'person' }],
    })
    expect(isReadyToFly(searching)).toBe(true)
  })

  /* A room with nothing to stay out of is a real room, and it can fly (ADR-0027). */
  it('flies with no zones drawn at all', () => {
    expect(isReadyToFly(ready({ zones: [] }))).toBe(true)
  })
})

describe('reaching a checkpoint', () => {
  it('counts anywhere inside the radius', () => {
    expect(hasReached(checkpoint, { eastM: 6.5, northM: 4 })).toBe(true)
    expect(hasReached(checkpoint, { eastM: 6, northM: 4 })).toBe(true)
  })

  it('counts the edge, because a boundary that excludes is a boundary that frustrates', () => {
    expect(hasReached(checkpoint, { eastM: 7, northM: 4 })).toBe(true)
  })

  it('does not count nearby', () => {
    expect(hasReached(checkpoint, { eastM: 8, northM: 4 })).toBe(false)
  })

  it('says no rather than guessing when the airframe cannot report where it is', () => {
    /*
     * `position` is optional on Telemetry. A Drone that cannot say where it is cannot be
     * scored on getting anywhere — and the wrong answer here is not "false", it is a
     * confident "true" from a fallback of zero, which would put every such craft at the
     * origin and mark a checkpoint there as reached.
     */
    expect(hasReached(checkpoint, null)).toBe(false)
    expect(hasReached(checkpoint, undefined)).toBe(false)

    const atOrigin: MissionCheckpoint = { ...checkpoint, at: { eastM: 0, northM: 0 } }
    expect(hasReached(atOrigin, undefined)).toBe(false)
  })
})
