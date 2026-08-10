import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { breachesAt } from './airspace'
import { hasReached } from './mission'
import {
  DEMO_CHECKPOINTS,
  DEMO_INCIDENT_AFTER_MS,
  DEMO_INCIDENT_AT,
  DEMO_MISSION_KEY,
  DEMO_MISSION_MINUTES,
  DEMO_ZONE,
  armDemoMission,
  demoIncidentDue,
  demoMission,
  disarmDemoMission,
  markDemoIncidentFired,
  readDemoMission,
} from './demo-mission'

/**
 * The two minute demonstration and its one scripted incident.
 *
 * The geometry is the part worth pinning. A Drone that breached the zone on its way to a
 * checkpoint would be demonstrating a badly drawn Mission rather than an incident, and a
 * drift that ended outside the zone would demonstrate nothing at all.
 */

beforeEach(() => window.localStorage.removeItem(DEMO_MISSION_KEY))
afterEach(() => window.localStorage.removeItem(DEMO_MISSION_KEY))

describe('the demonstration Mission', () => {
  it('runs two real minutes rather than a fast clock', () => {
    expect(demoMission(null, []).limitMinutes).toBe(DEMO_MISSION_MINUTES)
    expect(DEMO_MISSION_MINUTES).toBe(2)
  })

  it('carries something to do and the Drones to do it with', () => {
    const mission = demoMission('L-1', ['ttf-0001', 'ttf-0002'])

    expect(mission.checkpoints).toHaveLength(3)
    expect(mission.checkpoints.every((point) => point.required)).toBe(true)
    expect(mission.zones).toEqual([DEMO_ZONE])
    expect(mission.droneIds).toEqual(['ttf-0001', 'ttf-0002'])
    // Not started. Nothing here takes anything off the ground.
    expect(mission.startedAt).toBeNull()
  })

  /* Otherwise the demonstration shows a badly drawn Mission rather than an incident. */
  it('keeps every point clear of the No-fly Zone', () => {
    for (const point of DEMO_CHECKPOINTS) {
      expect(breachesAt([DEMO_ZONE], point.at)).toHaveLength(0)
    }
  })

  it('drifts to somewhere genuinely inside the zone', () => {
    expect(breachesAt([DEMO_ZONE], DEMO_INCIDENT_AT)).toHaveLength(1)
  })

  /* A drift that also ticked a point off would score the class for the incident. */
  it('drifts to somewhere that is not one of the points', () => {
    expect(DEMO_CHECKPOINTS.some((point) => hasReached(point, DEMO_INCIDENT_AT))).toBe(false)
  })
})

describe('when the scripted drift fires', () => {
  it('waits for the Mission to be under way', () => {
    const armed = armDemoMission()

    expect(demoIncidentDue(armed, null, 10_000_000)).toBe(false)
    expect(demoIncidentDue(armed, 1_000, 1_000 + DEMO_INCIDENT_AFTER_MS - 1)).toBe(false)
    expect(demoIncidentDue(armed, 1_000, 1_000 + DEMO_INCIDENT_AFTER_MS)).toBe(true)
  })

  it('does nothing at all unless a Teacher armed it', () => {
    expect(demoIncidentDue(readDemoMission(), 1_000, 10_000_000)).toBe(false)
  })

  it('happens once, not once a second', () => {
    armDemoMission()
    markDemoIncidentFired(50_000)

    expect(demoIncidentDue(readDemoMission(), 1_000, 10_000_000)).toBe(false)
  })

  it('can be turned off', () => {
    armDemoMission()
    disarmDemoMission()

    expect(readDemoMission().armed).toBe(false)
  })
})
