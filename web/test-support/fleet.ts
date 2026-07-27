import type { DemonstrationOptions } from '@/components/FleetProvider'

/**
 * The demonstration Fleet with the weather switched off.
 *
 * Every component test that renders a `FleetProvider` on a `/demo` path gets a real
 * simulated Fleet — the same `GroundStation`, ageing and charge forecast a School runs
 * (ADR-0013). That is the point of `LocalFleetLink` and it is worth keeping: these tests
 * assert against a Fleet that behaves rather than a fixture that cannot.
 *
 * What it also got, until this existed, was `Math.random` and spontaneous events. A Drone
 * took off unasked, or its link dropped on a 0.2%-per-tick roll, and an assertion about a
 * Fleet standing still on the ground became weather. The suite failed about one run in
 * three and named a different test each time — which reads as a broken board rather than
 * as a broken test, and is the most expensive kind of failure to have in a repository
 * whose whole gate is `npm test` run by hand.
 *
 * Pinned to the same values `local-fleet-link.test.ts` already uses, so there is one
 * answer in the suite to "what does a Drone do when nothing asks it to".
 *
 * Module-level, and it must stay that way: `FleetProvider` rebuilds its link when these
 * change, so a fresh object per render would restart the Fleet on every render.
 */
export const PINNED_DEMONSTRATION: DemonstrationOptions = {
  /* Mid-roll. Every threshold in the simulator sits well clear of it in both directions. */
  random: () => 0.5,
  spontaneous: false,
}
