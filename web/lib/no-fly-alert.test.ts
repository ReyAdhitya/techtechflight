import { describe, expect, it } from 'vitest'
import { breachesAt, type Zone } from './airspace.ts'
import {
  NoFlyAlertTracker,
  noFlyAlertFromBreach,
  noFlyAlertText,
} from './no-fly-alert.ts'
import { playbookFor } from './incident-playbook.ts'

/**
 * Entering a No-fly Zone raises one critical Alert with playbook words, not forty.
 */

const missionZone: Zone = {
  id: 'mission',
  kind: 'mission',
  name: 'the hall',
  points: [
    { eastM: 0, northM: 0 },
    { eastM: 10, northM: 0 },
    { eastM: 10, northM: 10 },
    { eastM: 0, northM: 10 },
  ],
}

const noFlyZone: Zone = {
  id: 'netting',
  kind: 'no-fly',
  name: 'the netting',
  points: [
    { eastM: 12, northM: 0 },
    { eastM: 16, northM: 0 },
    { eastM: 16, northM: 4 },
    { eastM: 12, northM: 4 },
  ],
}

const insideNoFly = { eastM: 14, northM: 2 }
const outsideMission = { eastM: -1, northM: 5 }
const safeInside = { eastM: 5, northM: 5 }

describe('noFlyAlertText', () => {
  it('names what to do from the playbook rather than where the Drone is', () => {
    const recommended = playbookFor('no-fly')!.responses[0]!
    expect(noFlyAlertText()).toBe(`${recommended.label}. ${recommended.detail}`)
    expect(noFlyAlertText()).toMatch(/turn back/i)
    expect(noFlyAlertText()).not.toMatch(/netting|entered|no-fly zone/i)
  })
})

describe('noFlyAlertFromBreach', () => {
  it('turns a No-fly entry into a critical Alert once', () => {
    const breach = breachesAt([missionZone, noFlyZone], insideNoFly)[0]!
    const alert = noFlyAlertFromBreach({
      ...breach,
      droneId: 'd1',
      at: 2_000,
    })
    expect(alert).toEqual({
      kind: 'no-fly',
      severity: 'critical',
      text: noFlyAlertText(),
      since: 2_000,
    })
  })

  it('ignores leaving the Mission Zone without entering a No-fly Zone', () => {
    const breach = breachesAt([missionZone], outsideMission)[0]!
    expect(
      noFlyAlertFromBreach({
        ...breach,
        droneId: 'd1',
        at: 1_000,
      }),
    ).toBeNull()
  })
})

describe('NoFlyAlertTracker', () => {
  it('raises one Alert while a craft hovers in a No-fly Zone, not forty', () => {
    const tracker = new NoFlyAlertTracker()
    const zones = [missionZone, noFlyZone]
    const breach = breachesAt(zones, insideNoFly)[0]!
    const alerts = []

    for (let tick = 0; tick < 40; tick += 1) {
      alerts.push(...tracker.observe('d1', [breach], 1_000 + tick))
    }

    expect(alerts).toHaveLength(1)
    expect(alerts[0]!.kind).toBe('no-fly')
    expect(alerts[0]!.severity).toBe('critical')
    expect(alerts[0]!.text).toBe(noFlyAlertText())
  })

  it('raises again after the Drone leaves and re-enters', () => {
    const tracker = new NoFlyAlertTracker()
    const zones = [missionZone, noFlyZone]
    const breach = breachesAt(zones, insideNoFly)[0]!

    expect(tracker.observe('d1', [breach], 1_000)).toHaveLength(1)
    expect(tracker.observe('d1', [], 5_000)).toEqual([])
    expect(tracker.observe('d1', [breach], 9_000)).toHaveLength(1)
    expect(tracker.observe('d1', [breach], 9_500)).toEqual([])
  })

  it('does not raise for left-mission-zone while still tracking No-fly edges', () => {
    const tracker = new NoFlyAlertTracker()
    const zones = [missionZone, noFlyZone]
    const outsideOnly = breachesAt(zones, outsideMission)

    expect(tracker.observe('d1', outsideOnly, 1_000)).toEqual([])

    const inNoFly = breachesAt(zones, insideNoFly)
    expect(tracker.observe('d1', inNoFly, 2_000)).toHaveLength(1)
  })

  it('keeps Drones independent in a fleet-wide observe', () => {
    const tracker = new NoFlyAlertTracker()
    const zones = [missionZone, noFlyZone]
    const breach = breachesAt(zones, insideNoFly)[0]!

    const first = tracker.observeFleet(
      [
        { droneId: 'a', breaches: [breach] },
        { droneId: 'b', breaches: [] },
      ],
      1_000,
    )
    expect(first).toHaveLength(1)
    expect(first[0]!.droneId).toBe('a')

    const steady = tracker.observeFleet(
      [
        { droneId: 'a', breaches: [breach] },
        { droneId: 'b', breaches: [breach] },
      ],
      2_000,
    )
    expect(steady).toHaveLength(1)
    expect(steady[0]!.droneId).toBe('b')
  })

  it('walks a position series the way a live Integrator would', () => {
    const tracker = new NoFlyAlertTracker()
    const zones = [missionZone, noFlyZone]
    const positions = [safeInside, outsideMission, outsideMission, insideNoFly]
    const allAlerts = []

    for (let i = 0; i < positions.length; i += 1) {
      const breaches = breachesAt(zones, positions[i]!)
      allAlerts.push(...tracker.observe('d1', breaches, i * 1_000))
    }

    expect(allAlerts).toHaveLength(1)
    expect(allAlerts[0]!.kind).toBe('no-fly')
  })

  it('forgets everything on reset', () => {
    const tracker = new NoFlyAlertTracker()
    const zones = [missionZone, noFlyZone]
    const breach = breachesAt(zones, insideNoFly)[0]!

    tracker.observe('d1', [breach], 1_000)
    tracker.reset()

    expect(tracker.observe('d1', [breach], 2_000)).toHaveLength(1)
  })
})
