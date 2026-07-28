import { describe, expect, it } from 'vitest'
import { isCommandable, type TelemetryObservation } from '@techtechflight/contract'
import { TestClock } from '@techtechflight/contract/testing'
import { MavlinkTelemetrySource } from './mavlink-source.ts'
import {
  FRAME_ATTITUDE,
  FRAME_HEARTBEAT_ARMED,
  FRAME_HEARTBEAT_CRITICAL,
  FRAME_LOCAL_POSITION,
  FRAME_SYS_STATUS_71,
  FRAME_SYS_STATUS_84,
} from './recorded-frames.ts'

function source(idForSystem?: (systemId: number) => string) {
  const clock = new TestClock(1_000_000)
  const mavlink = new MavlinkTelemetrySource({
    clock,
    ...(idForSystem ? { idForSystem } : {}),
  })
  const observations: TelemetryObservation[] = []
  mavlink.onObservation((observation) => observations.push(observation))
  return { clock, mavlink, observations }
}

describe('MavlinkTelemetrySource', () => {
  it('does not accept Commands — monitoring only, per ADR-0011', () => {
    const { mavlink } = source()
    expect(isCommandable(mavlink)).toBe(false)
  })

  it('emits nothing until battery is known', () => {
    const { mavlink, observations } = source()

    mavlink.ingest(FRAME_HEARTBEAT_ARMED)
    mavlink.ingest(FRAME_LOCAL_POSITION)

    expect(observations).toHaveLength(0)
  })

  it('maps SYS_STATUS and LOCAL_POSITION_NED onto a Telemetry reading', () => {
    const { mavlink, observations } = source((systemId) => `ttf-000${systemId}`)

    mavlink.ingest(FRAME_HEARTBEAT_ARMED)
    mavlink.ingest(FRAME_SYS_STATUS_84)
    mavlink.ingest(FRAME_LOCAL_POSITION)
    mavlink.ingest(FRAME_ATTITUDE)

    const last = observations.at(-1)
    expect(last?.droneId).toBe('ttf-0001')
    expect(last?.telemetry).toMatchObject({
      batteryFraction: 0.84,
      batteryIsEstimate: false,
      airborne: true,
      altitudeM: 1.7,
      position: { eastM: 2.4, northM: 1.1 },
      fault: null,
    })
    expect(last?.telemetry.orientation?.yawDegrees).toBeCloseTo(90, 0)
  })

  it('hands out a fresh Telemetry object on every reading', () => {
    const { mavlink, observations } = source()

    mavlink.ingest(FRAME_SYS_STATUS_84)
    mavlink.ingest(FRAME_SYS_STATUS_71)

    expect(observations).toHaveLength(2)
    const [first, second] = observations
    expect(first!.telemetry).not.toBe(second!.telemetry)
    expect(first!.telemetry.batteryFraction).toBe(0.84)
    expect(second!.telemetry.batteryFraction).toBe(0.71)
  })

  it('reports a Fault when the autopilot says CRITICAL', () => {
    const { mavlink, observations } = source()

    mavlink.ingest(FRAME_SYS_STATUS_84)
    mavlink.ingest(FRAME_HEARTBEAT_CRITICAL)

    expect(observations.at(-1)?.telemetry.fault).toMatchObject({
      code: 'MAV_STATE',
      description: 'Autopilot reports a critical condition',
    })
  })

  it('never opens a socket when only recorded frames are fed', () => {
    // connect() is what binds UDP. The recorded-frame path is ingest() alone, so the
    // suite stays free of ports, sleeps, and SITL.
    const { mavlink, clock, observations } = source()

    mavlink.ingest(FRAME_SYS_STATUS_84)
    clock.advance(60_000)

    expect(observations).toHaveLength(1)
    expect(observations[0]!.telemetry.batteryFraction).toBe(0.84)
  })
})
