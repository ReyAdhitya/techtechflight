import { describe, expect, it } from 'vitest'
import {
  aDroneState,
  aFleetState,
  aNoResponseDrone,
  aTelemetry,
} from '@techtechflight/contract/fixtures'
import type { DroneState, FleetState } from '@techtechflight/contract'
import {
  AlertTracker,
  AltitudeTracker,
  alertQueue,
  compareStrips,
  enduranceMs,
  fleetVitals,
  flightPhase,
  separations,
  LOW_ENDURANCE_MS,
  SEPARATION_WARNING_M,
  VERTICAL_DEADBAND_MPS,
  type AlertKind,
  type VitalsInput,
} from './vitals'

/**
 * The controller's read of the room.
 *
 * These are the numbers a Teacher acts on while thirty children are flying, so the cases
 * worth the most attention are the ones where the honest answer is "not known" — a rate
 * with one sample behind it, a charge that is going up, a Fleet with nothing airborne.
 */

const NOW = 1_000_000

function flying(overrides: Partial<DroneState> = {}): DroneState {
  return aDroneState({
    status: 'Flying',
    lastContact: NOW,
    telemetry: aTelemetry({ airborne: true, altitudeM: 2, ...(overrides.telemetry ?? {}) }),
    ...overrides,
  })
}

function input(state: FleetState, extra: Partial<VitalsInput> = {}): VitalsInput {
  return {
    state,
    receivedAt: state.generatedAt,
    now: state.generatedAt,
    batteries: [],
    rates: new Map(),
    ...extra,
  }
}

function kinds(alerts: readonly { kind: AlertKind }[]): AlertKind[] {
  return alerts.map((alert) => alert.kind)
}

describe('flight phase', () => {
  it('puts a latched emergency stop above everything, silence included', () => {
    const drone = aDroneState({
      status: 'Offline',
      telemetry: aTelemetry({ emergencyStopTriggered: true, airborne: true }),
    })
    expect(flightPhase(drone, 5)).toBe('emergency')
  })

  it('says no-contact rather than guessing', () => {
    expect(flightPhase(aNoResponseDrone(), null)).toBe('no-contact')
    expect(flightPhase(aDroneState({ status: 'Offline' }), 2)).toBe('no-contact')
  })

  it('puts an auto-landing above the direction it happens to be going', () => {
    const drone = flying({ telemetry: aTelemetry({ airborne: true, autoLanding: 'in-progress' }) })
    expect(flightPhase(drone, -2)).toBe('auto-landing')
  })

  it('reads on-ground from the airframe rather than from an altitude of zero', () => {
    const drone = aDroneState({ telemetry: aTelemetry({ airborne: false, altitudeM: 0 }) })
    expect(flightPhase(drone, null)).toBe('on-ground')
  })

  it('separates climbing, descending and level by the deadband', () => {
    expect(flightPhase(flying(), VERTICAL_DEADBAND_MPS + 0.01)).toBe('climbing')
    expect(flightPhase(flying(), -VERTICAL_DEADBAND_MPS - 0.01)).toBe('descending')
    expect(flightPhase(flying(), 0)).toBe('level')
  })

  it('holds the deadband boundary as level rather than as movement', () => {
    expect(flightPhase(flying(), VERTICAL_DEADBAND_MPS)).toBe('level')
    expect(flightPhase(flying(), -VERTICAL_DEADBAND_MPS)).toBe('level')
  })

  it('says flying, not level, when the direction is not yet known', () => {
    // One reading in. Calling that level asserts something nothing has measured.
    expect(flightPhase(flying(), null)).toBe('flying')
  })
})

describe('endurance', () => {
  const usable = 0.3

  it('needs two readings', () => {
    expect(enduranceMs([{ at: 0, fraction: 0.9 }], usable)).toBeNull()
    expect(enduranceMs([], usable)).toBeNull()
  })

  it('needs a long enough span to mean anything', () => {
    const samples = [
      { at: 0, fraction: 0.9 },
      { at: 29_000, fraction: 0.8 },
    ]
    expect(enduranceMs(samples, usable)).toBeNull()
  })

  it('projects the observed slope down to the usable threshold', () => {
    // 0.10 lost over 60s, 0.30 left above the threshold → 180s.
    const samples = [
      { at: 0, fraction: 0.7 },
      { at: 60_000, fraction: 0.6 },
    ]
    expect(enduranceMs(samples, usable)).toBeCloseTo(180_000, -2)
  })

  it('refuses to forecast a battery that is flat or on charge', () => {
    const flat = [
      { at: 0, fraction: 0.6 },
      { at: 60_000, fraction: 0.6 },
    ]
    const rising = [
      { at: 0, fraction: 0.5 },
      { at: 60_000, fraction: 0.7 },
    ]
    expect(enduranceMs(flat, usable)).toBeNull()
    expect(enduranceMs(rising, usable)).toBeNull()
  })

  it('is zero, not negative, once already below the threshold', () => {
    const samples = [
      { at: 0, fraction: 0.3 },
      { at: 60_000, fraction: 0.2 },
    ]
    expect(enduranceMs(samples, usable)).toBe(0)
  })
})

describe('separation', () => {
  const at = (id: string, eastM: number, northM: number, airborne = true) =>
    aDroneState({
      id,
      name: id.toUpperCase(),
      status: airborne ? 'Flying' : 'Ready',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne, position: { eastM, northM } }),
    })

  it('is empty with nothing airborne', () => {
    expect(separations([at('a', 0, 0, false), at('b', 0.2, 0, false)]).size).toBe(0)
  })

  it('is empty with only one aircraft up', () => {
    expect(separations([at('a', 0, 0), at('b', 0.2, 0, false)]).size).toBe(0)
  })

  it('reports the nearest other aircraft and names it', () => {
    const found = separations([at('a', 0, 0), at('b', 3, 0), at('c', 1, 0)])
    expect(found.get('a')?.metres).toBeCloseTo(1)
    expect(found.get('a')?.withCallsign).toBe('C')
    expect(found.get('b')?.withCallsign).toBe('C')
  })

  it('ignores a Drone that is up but not reporting where it is', () => {
    const blind = aDroneState({
      id: 'b',
      status: 'Flying',
      telemetry: aTelemetry({ airborne: true }),
    })
    expect(separations([at('a', 0, 0), blind]).size).toBe(0)
  })
})

describe('alerts', () => {
  function alertsOf(drone: DroneState, extra: Partial<VitalsInput> = {}) {
    const state = aFleetState([drone], NOW)
    return fleetVitals(input(state, extra))[0]!.alerts
  }

  it('raises an emergency stop as critical', () => {
    const alerts = alertsOf(flying({ telemetry: aTelemetry({ airborne: true, emergencyStopTriggered: true }) }))
    expect(kinds(alerts)).toContain('emergency-stop')
    expect(alerts.find((a) => a.kind === 'emergency-stop')!.severity).toBe('critical')
  })

  it('raises a fault and quotes what it is', () => {
    const alerts = alertsOf(
      flying({
        telemetry: aTelemetry({
          airborne: true,
          fault: { code: 'IMU', description: 'Motion sensor needs recalibrating' },
        }),
      }),
    )
    const fault = alerts.find((a) => a.kind === 'fault')!
    expect(fault.severity).toBe('critical')
    expect(fault.text).toContain('Motion sensor needs recalibrating')
  })

  it('treats silence from an aircraft that is up as worse than silence on the ground', () => {
    const upAndQuiet = aDroneState({
      status: 'Flying',
      lastContact: NOW - 60_000,
      telemetry: aTelemetry({ airborne: true }),
    })
    const parkedAndQuiet = aDroneState({
      status: 'Ready',
      lastContact: NOW - 60_000,
      telemetry: aTelemetry({ airborne: false }),
    })
    const up = alertsOf(upAndQuiet).find((a) => a.kind === 'no-response')!
    const parked = alertsOf(parkedAndQuiet).find((a) => a.kind === 'no-response')!
    expect(up.severity).toBe('critical')
    expect(parked.severity).toBe('warning')
  })

  it('raises an obstacle only inside the warning distance', () => {
    const near = flying({ telemetry: aTelemetry({ airborne: true, proximity: { metres: 0.6, bearingDegrees: 90 } }) })
    const clear = flying({ telemetry: aTelemetry({ airborne: true, proximity: { metres: 2, bearingDegrees: 90 } }) })
    expect(kinds(alertsOf(near))).toContain('obstacle')
    expect(kinds(alertsOf(clear))).not.toContain('obstacle')
  })

  it('does not invent an obstacle for an airframe with no rangefinder', () => {
    // proximity absent entirely — no sensor. Distinct from null, which is "sees nothing".
    expect(kinds(alertsOf(flying()))).not.toContain('obstacle')
    const fitted = flying({ telemetry: aTelemetry({ airborne: true, proximity: null }) })
    expect(kinds(alertsOf(fitted))).not.toContain('obstacle')
  })

  it('raises separation when two aircraft are inside the warning distance', () => {
    const a = aDroneState({
      id: 'a',
      name: 'A',
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true, position: { eastM: 0, northM: 0 } }),
    })
    const b = aDroneState({
      id: 'b',
      name: 'B',
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true, position: { eastM: SEPARATION_WARNING_M - 0.5, northM: 0 } }),
    })
    const vitals = fleetVitals(input(aFleetState([a, b], NOW)))
    expect(kinds(vitals[0]!.alerts)).toContain('separation')
    expect(vitals[0]!.alerts.find((x) => x.kind === 'separation')!.text).toContain('B')
  })

  it('raises low endurance only while airborne', () => {
    // 0.5 lost over 60s from 0.55 → about 6s left, well under the threshold.
    const batteries = [
      {
        droneId: 'drone-1',
        samples: [
          { at: NOW - 60_000, fraction: 0.85 },
          { at: NOW, fraction: 0.35 },
        ],
      },
    ]
    const up = alertsOf(
      flying({ telemetry: aTelemetry({ airborne: true, batteryFraction: 0.35 }) }),
      { batteries },
    )
    const down = alertsOf(
      aDroneState({ lastContact: NOW, telemetry: aTelemetry({ airborne: false, batteryFraction: 0.35 }) }),
      { batteries },
    )
    expect(kinds(up)).toContain('low-endurance')
    expect(kinds(down)).not.toContain('low-endurance')
  })

  it('raises uneven motors past the spread, not at it', () => {
    const spread = (high: number) =>
      flying({
        telemetry: aTelemetry({
          airborne: true,
          motors: [
            { id: 'front-left', thrustFraction: 0.5 },
            { id: 'front-right', thrustFraction: high },
          ],
        }),
      })
    expect(kinds(alertsOf(spread(0.75)))).not.toContain('uneven-motors')
    expect(kinds(alertsOf(spread(0.76)))).toContain('uneven-motors')
  })

  it('raises a low battery on the ground as information, not as an emergency', () => {
    const parked = aDroneState({
      status: 'Not Ready',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, batteryFraction: 0.1 }),
    })
    const alert = alertsOf(parked).find((a) => a.kind === 'battery-low')!
    expect(alert.severity).toBe('info')
  })

  it('orders a Drone\'s own alerts worst first', () => {
    const bad = flying({
      telemetry: aTelemetry({
        airborne: true,
        emergencyStopTriggered: true,
        proximity: { metres: 0.2, bearingDegrees: 0 },
      }),
    })
    expect(alertsOf(bad)[0]!.severity).toBe('critical')
  })
})

describe('the Fleet-wide queue', () => {
  it('puts every critical ahead of every warning, whichever Drone they came from', () => {
    const calmButClose = aDroneState({
      id: 'a',
      name: 'A',
      status: 'Flying',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: true, proximity: { metres: 0.5, bearingDegrees: 0 } }),
    })
    const stopped = aDroneState({
      id: 'b',
      name: 'B',
      status: 'Fault',
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, emergencyStopTriggered: true }),
    })
    const queue = alertQueue(fleetVitals(input(aFleetState([calmButClose, stopped], NOW))))
    expect(queue[0]!.severity).toBe('critical')
    expect(queue[0]!.callsign).toBe('B')
  })

  it('is empty for a Fleet with nothing wrong', () => {
    const fine = aDroneState({ lastContact: NOW, telemetry: aTelemetry({ batteryFraction: 0.9 }) })
    expect(alertQueue(fleetVitals(input(aFleetState([fine], NOW))))).toEqual([])
  })
})

describe('when a condition began', () => {
  const stopped = () =>
    aDroneState({
      lastContact: NOW,
      telemetry: aTelemetry({ emergencyStopTriggered: true }),
    })

  it('stamps a brand new condition with the moment it appeared', () => {
    const vitals = fleetVitals(input(aFleetState([stopped()], NOW), { now: 5_000 }))
    expect(vitals[0]!.alerts[0]!.since).toBe(5_000)
  })

  it('keeps the original start time as the condition persists', () => {
    const tracker = new AlertTracker()
    const first = fleetVitals(input(aFleetState([stopped()], NOW), { now: 5_000 }))
    tracker.observe(first, 5_000)

    const later = fleetVitals(
      input(aFleetState([stopped()], NOW), { now: 90_000, firstSeen: tracker.firstSeen }),
    )
    expect(later[0]!.alerts[0]!.since).toBe(5_000)
  })

  it('forgets a condition that has cleared, so its return is new news', () => {
    const tracker = new AlertTracker()
    tracker.observe(fleetVitals(input(aFleetState([stopped()], NOW), { now: 5_000 })), 5_000)
    expect(tracker.firstSeen.size).toBe(1)

    // Released. Nothing wrong with it now.
    const released = aDroneState({ lastContact: NOW, telemetry: aTelemetry({}) })
    tracker.observe(fleetVitals(input(aFleetState([released], NOW), { now: 60_000 })), 60_000)
    expect(tracker.firstSeen.size).toBe(0)

    // Pressed again an hour later — dated then, not an hour ago.
    const again = fleetVitals(
      input(aFleetState([stopped()], NOW), { now: 3_600_000, firstSeen: tracker.firstSeen }),
    )
    expect(again[0]!.alerts[0]!.since).toBe(3_600_000)
  })
})

describe('strip order', () => {
  const withAlerts = (id: string, name: string, telemetry: Parameters<typeof aTelemetry>[0]) =>
    aDroneState({ id, name, lastContact: NOW, telemetry: aTelemetry(telemetry) })

  it('puts two criticals above one, rather than falling back to the callsign', () => {
    // 'Zulu' would sort last alphabetically, and has the worse aircraft.
    const oneCritical = withAlerts('a', 'Alpha', { emergencyStopTriggered: true })
    const twoCriticals = withAlerts('z', 'Zulu', {
      emergencyStopTriggered: true,
      fault: { code: 'IMU', description: 'Motion sensor needs recalibrating' },
    })
    const ordered = [...fleetVitals(input(aFleetState([oneCritical, twoCriticals], NOW)))].sort(
      compareStrips,
    )
    expect(ordered[0]!.callsign).toBe('Zulu')
  })

  it('leaves a Fleet with nothing wrong in a stable callsign order', () => {
    const fine = (id: string, name: string) =>
      aDroneState({ id, name, lastContact: NOW, telemetry: aTelemetry({}) })
    const ordered = [...fleetVitals(input(aFleetState([fine('c', 'Charlie'), fine('a', 'Alpha')], NOW)))].sort(
      compareStrips,
    )
    expect(ordered.map((entry) => entry.callsign)).toEqual(['Alpha', 'Charlie'])
  })

  it('sinks a Drone with nothing wrong below one with only information', () => {
    const fine = withAlerts('a', 'Alpha', {})
    const lowOnCharge = withAlerts('z', 'Zulu', { batteryFraction: 0.1 })
    const ordered = [...fleetVitals(input(aFleetState([fine, lowOnCharge], NOW)))].sort(compareStrips)
    expect(ordered[0]!.callsign).toBe('Zulu')
  })
})

describe('a Fleet with nothing wrong', () => {
  it('produces no alerts at all, which is the tower\'s empty state', () => {
    const healthy = [1, 2, 3].map((n) =>
      aDroneState({
        id: `d${n}`,
        name: `Drone ${n}`,
        status: 'Ready',
        lastContact: NOW,
        telemetry: aTelemetry({ batteryFraction: 0.9, airborne: false }),
      }),
    )
    const vitals = fleetVitals(input(aFleetState(healthy, NOW)))
    expect(vitals.every((entry) => entry.alerts.length === 0)).toBe(true)
    expect(alertQueue(vitals)).toEqual([])
  })
})

describe('the altitude tracker', () => {
  it('gives no rate from a single reading', () => {
    const tracker = new AltitudeTracker()
    tracker.observe(aFleetState([flying({ lastContact: 1_000 })], 1_000))
    expect(tracker.rates().get('drone-1')).toBeNull()
  })

  it('measures a climb between two readings', () => {
    const tracker = new AltitudeTracker()
    tracker.observe(
      aFleetState([flying({ lastContact: 1_000, telemetry: aTelemetry({ airborne: true, altitudeM: 1 }) })], 1_000),
    )
    tracker.observe(
      aFleetState([flying({ lastContact: 3_000, telemetry: aTelemetry({ airborne: true, altitudeM: 3 }) })], 3_000),
    )
    expect(tracker.rates().get('drone-1')).toBeCloseTo(1)
  })

  it('ignores a repeat of the same contact moment, which carries no new time', () => {
    const tracker = new AltitudeTracker()
    const snapshot = aFleetState(
      [flying({ lastContact: 1_000, telemetry: aTelemetry({ airborne: true, altitudeM: 1 }) })],
      1_000,
    )
    tracker.observe(snapshot)
    tracker.observe(snapshot)
    tracker.observe(snapshot)
    expect(tracker.rates().get('drone-1')).toBeNull()
  })

  it('does not track an airframe that cannot report altitude', () => {
    const tracker = new AltitudeTracker()
    tracker.observe(
      aFleetState([aDroneState({ lastContact: 1_000, telemetry: aTelemetry({ airborne: true }) })], 1_000),
    )
    expect(tracker.rates().has('drone-1')).toBe(false)
  })
})

describe('vitals as a whole', () => {
  it('keeps absent readings absent rather than reporting them as zero', () => {
    const bare = aDroneState({ lastContact: NOW, telemetry: aTelemetry({ airborne: false }) })
    const vitals = fleetVitals(input(aFleetState([bare], NOW)))[0]!
    expect(vitals.altitudeM).toBeNull()
    expect(vitals.position).toBeNull()
    expect(vitals.separationM).toBeNull()
    expect(vitals.enduranceMs).toBeNull()
  })

  it('carries no response age for a Drone that has never responded', () => {
    const vitals = fleetVitals(input(aFleetState([aNoResponseDrone()], NOW)))[0]!
    expect(vitals.responseAgeMs).toBeNull()
    expect(vitals.phase).toBe('no-contact')
    expect(vitals.batteryFraction).toBeNull()
  })

  it('always gives an array of alerts, never null', () => {
    const vitals = fleetVitals(input(aFleetState([aNoResponseDrone()], NOW)))[0]!
    expect(Array.isArray(vitals.alerts)).toBe(true)
  })

  it('reads airborne from the airframe, not from the phase it resolved to', () => {
    // A latched emergency stop resolves to `emergency` whichever way it happened, so
    // phase cannot answer "is this thing off the ground" and a separate field must.
    const stoppedOnADesk = aDroneState({
      lastContact: NOW,
      telemetry: aTelemetry({ airborne: false, emergencyStopTriggered: true, altitudeM: 0 }),
    })
    const vitals = fleetVitals(input(aFleetState([stoppedOnADesk], NOW)))[0]!
    expect(vitals.phase).toBe('emergency')
    expect(vitals.airborne).toBe(false)
  })

  it('threshold constants are the ones the spec fixed', () => {
    expect(SEPARATION_WARNING_M).toBe(1.5)
    expect(LOW_ENDURANCE_MS).toBe(120_000)
    expect(VERTICAL_DEADBAND_MPS).toBe(0.25)
  })
})
