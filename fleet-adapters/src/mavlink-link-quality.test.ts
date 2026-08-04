import { describe, expect, it } from 'vitest'
import { TestClock } from '@techtechflight/contract/testing'
import type { TelemetryObservation } from '@techtechflight/contract'
import { MavlinkTelemetrySource } from './mavlink-source.ts'
import { MavLinkProtocolV2, common, minimal } from 'node-mavlink'

/**
 * Signal strength off a real link.
 *
 * The interesting cases are both about absence. A link that never sends RADIO_STATUS must
 * leave `linkQuality` off the Telemetry entirely rather than reporting zero — the board
 * reads absent as "cannot report" and zero as "about to fail", and drawing an empty bar on
 * a healthy link is the exact confusion the absent-versus-null rule exists to prevent.
 *
 * And RADIO_STATUS on its own must not conjure a craft: it describes the radio, not an
 * aircraft, so a draft holding nothing else is still not a contact.
 */

const HOST = '127.0.0.1'

function sourceFor(ids: Record<number, string>) {
  const observed: TelemetryObservation[] = []
  const source = new MavlinkTelemetrySource({
    clock: new TestClock(1_000_000),
    host: HOST,
    port: 0,
    idForSystem: (systemId) => ids[systemId] ?? `unmapped-${systemId}`,
  })
  source.onObservation((observation) => observed.push(observation))
  return { source, observed }
}

/** Encode one message the way the wire would, so the parser does the real work. */
function frame(systemId: number, message: object): Uint8Array {
  const protocol = new MavLinkProtocolV2(systemId, 1)
  return protocol.serialize(message as never, 0)
}

function heartbeat(systemId: number) {
  const message = new minimal.Heartbeat()
  message.baseMode = minimal.MavModeFlag.SAFETY_ARMED & 0
  // Anything but UNINIT, so the draft counts as a contact and a Telemetry is emitted.
  message.systemStatus = minimal.MavState.STANDBY
  return frame(systemId, message)
}

describe('link quality from RADIO_STATUS', () => {
  it('is absent when the link never describes itself', () => {
    const { source, observed } = sourceFor({ 1: 'ttf-0001' })
    source.ingest(heartbeat(1))

    const telemetry = observed.at(-1)?.telemetry
    expect(telemetry).toBeDefined()
    expect(telemetry && 'linkQuality' in telemetry).toBe(false)
  })

  it('does not invent a craft out of a radio report', () => {
    /*
     * RADIO_STATUS carries no aircraft. A draft holding only signal strength has not
     * heard from anything that flies, and emitting one would put a phantom Drone on the
     * board that no Teacher owns.
     */
    const { source, observed } = sourceFor({ 51: 'ttf-0009' })
    const status = new common.RadioStatus()
    status.rssi = 200
    source.ingest(frame(51, status))

    expect(observed).toHaveLength(0)
  })

  it('scales rssi to a proportion rather than passing the raw number through', () => {
    const { source, observed } = sourceFor({ 1: 'ttf-0001' })
    source.ingest(heartbeat(1))

    const status = new common.RadioStatus()
    status.rssi = 127
    source.ingest(frame(1, status))

    const quality = observed.at(-1)?.telemetry.linkQuality
    expect(quality).toBeGreaterThan(0.4)
    expect(quality).toBeLessThan(0.6)
  })

  it('never reports more than a full-strength link', () => {
    const { source, observed } = sourceFor({ 1: 'ttf-0001' })
    source.ingest(heartbeat(1))

    const status = new common.RadioStatus()
    status.rssi = 254
    source.ingest(frame(1, status))

    expect(observed.at(-1)?.telemetry.linkQuality).toBe(1)
  })
})
