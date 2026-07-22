/**
 * The simulated Fleet, behind its own entry point.
 *
 * Separate from the package root so that a rule forbidding the screens from reaching for a
 * simulation is a rule about one import specifier, checkable by a tool, rather than an
 * agreement about a directory that nobody notices being broken.
 */

export {
  SimulatedTelemetrySource,
  type SimulatorOptions,
} from './simulated-telemetry-source.ts'
export { CLASSROOM_FLEET } from './classroom-fleet.ts'
