/**
 * Everything that owns the Fleet.
 *
 * Status derivation, the ageing of Telemetry into Stale and then Offline, the forecast of a
 * return to Ready, and the record of what happened.
 *
 * It sits apart from the ground station because none of it is Node. Time arrives as an
 * injected Clock and randomness is injected beside it — both because the tests demanded it,
 * and both of which are what let this same code run in a Teacher's browser with no server
 * behind it (ADR-0013). One implementation of Status, wherever it runs: two boards on one
 * Fleet must never disagree about what they are looking at.
 *
 * `deriveStatus`, `isStale` and the charge forecast are deliberately not exported. Nothing
 * outside this package uses them, and Status is derived here or nowhere.
 *
 * The simulated Telemetry Source has its own entry point rather than sitting here, so that
 * "no screen may import the simulator" is a rule about one specifier rather than about a
 * directory.
 */

export { GroundStation, type CommandOutcome, type GroundStationOptions } from './fleet.ts'
export { FleetHistoryRecorder } from './history.ts'
