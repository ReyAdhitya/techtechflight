import { describe, expect, it } from 'vitest'
import type {
  DroneRegistration,
  FleetState,
  Telemetry,
  TelemetryObservation,
  TelemetrySource,
  Unsubscribe,
} from '@techtechflight/contract'
import { TestClock } from '@techtechflight/contract/testing'
import { aTelemetry } from '@techtechflight/contract/fixtures'
import { GroundStation } from './fleet.ts'

/**
 * What the ground station needs from a Telemetry Source, beyond the interface.
 *
 * ADR-0001 says adding real hardware is "one new implementation of `TelemetrySource` and
 * nothing else". That is true of the shape and not quite true of the behaviour: the
 * ground station keeps the Telemetry object it is handed rather than copying it, and
 * compares Fleet States by that reference to decide whether anything changed. So a source
 * that fills one buffer and re-emits it — which is exactly what a serial or MQTT adapter
 * is likely to do — hands the ground station an object that changes underneath every Fleet
 * State it has already published.
 *
 * `CODEBASE_AUDIT.md` §8 recorded the reference comparison and judged it worth a test
 * rather than a fix. This is that test, and it asserts the requirement rather than the
 * hazard: a source that reports a fresh object is fully served, including the case the
 * reference comparison exists to get right.
 *
 * The failing half is deliberately not pinned here. Asserting that a mutated re-emit goes
 * unpublished would lock the defect in place and fail the day someone copies on ingest,
 * which is the fix if this ever bites.
 */

const FLEET: readonly DroneRegistration[] = [{ id: 'ttf-0001', name: 'Drone 1', boardOrder: 1 }]

/** A source that reports a fresh Telemetry object every time, as every source must. */
class FreshTelemetrySource implements TelemetrySource {
  #listeners = new Set<(observation: TelemetryObservation) => void>()

  connect(): void {}
  disconnect(): void {}

  onObservation(listener: (observation: TelemetryObservation) => void): Unsubscribe {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }

  report(telemetry: Partial<Telemetry>): void {
    const observation: TelemetryObservation = {
      droneId: 'ttf-0001',
      telemetry: aTelemetry(telemetry),
    }
    for (const listener of this.#listeners) listener(observation)
  }
}

function station() {
  const clock = new TestClock(1_000_000)
  const source = new FreshTelemetrySource()
  const ground = new GroundStation({ registrations: FLEET, source, clock })
  ground.start()

  const published: FleetState[] = []
  ground.onFleetState((state) => published.push(state))
  return { clock, source, ground, published }
}

const chargeOn = (state: FleetState | undefined) => state?.drones[0]?.telemetry?.batteryFraction

describe('a Telemetry Source that reports a fresh reading each time', () => {
  it('has every reading published, including two inside the same millisecond', () => {
    const { source, published, ground } = station()

    source.report({ batteryFraction: 0.9 })
    // No clock advance between these two. `lastContact` is identical for both, so the
    // only thing that can tell them apart is the Telemetry itself — which is precisely
    // what `sameFleet`'s reference comparison is for, and precisely what a source that
    // reused one object would take away.
    source.report({ batteryFraction: 0.8 })

    expect(published.map(chargeOn)).toEqual([0.9, 0.8])
    ground.stop()
  })

  it('leaves a Fleet State it has already published alone', () => {
    const { source, clock, published, ground } = station()

    source.report({ batteryFraction: 0.9 })
    const first = published[0]
    clock.advance(1_000)
    source.report({ batteryFraction: 0.4 })

    // A published Fleet State is a statement about a moment. The board keeps these — the
    // history it merges, and the last Fleet it holds across a reconnect — so one that
    // rewrote itself later would make a Teacher's timeline disagree with what they saw.
    expect(chargeOn(first)).toBe(0.9)
    expect(chargeOn(published.at(-1))).toBe(0.4)
    ground.stop()
  })

  it('is still published when only the moment of contact has moved', () => {
    const { source, clock, published, ground } = station()

    source.report({ batteryFraction: 0.9 })
    clock.advance(1_000)
    source.report({ batteryFraction: 0.9 })

    /*
     * Named for what happens rather than for what `sameFleet`'s comment implies. It is
     * described as publishing "only when the Fleet actually changed", which reads as a
     * filter on identical readings; it is not one, and an unchanged reading a second later
     * still reaches every screen. That is defensible — Last Contact is displayed and every
     * value on the board is qualified by it (A3) — but it is the reading of `sameFleet` a
     * future reader is most likely to get wrong, so it is written down.
     *
     * Mutation-checked, and the result is worth recording: blinding the `lastContact`
     * comparison does **not** fail this test. The publish here is earned by the Telemetry
     * object being a fresh one, not by the moment moving. Nothing in this file covers the
     * `lastContact` comparison on its own, and reaching it would need a source that reuses
     * its Telemetry object — the one thing the file exists to say a source must not do.
     */
    expect(published).toHaveLength(2)
    expect(published.map(chargeOn)).toEqual([0.9, 0.9])
    ground.stop()
  })
})
