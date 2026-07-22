/**
 * Everything that owns the Fleet.
 *
 * Status derivation, the ageing of Telemetry into Stale and then Offline, the forecast of a
 * return to Ready, the record of what happened, and the simulated Telemetry Source.
 *
 * It sits apart from the ground station because none of it is Node. Time arrives as an
 * injected Clock and randomness is injected beside it — both because the tests demanded it,
 * and both of which are what let this same code run in a Teacher's browser with no server
 * behind it (ADR-0013). One implementation of Status, wherever it runs: two boards on one
 * Fleet must never disagree about what they are looking at.
 *
 * Empty for now. The modules arrive next, moved rather than rewritten.
 */

export {}
