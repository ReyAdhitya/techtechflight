import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Which Telemetry Source the classroom laptop prefers after the boss picks on Settings.
 *
 * Env `TELEMETRY_SOURCE` still wins for developers. Missing / corrupt file → simulator.
 * Writing here does not hot-swap a running process — restart the ground station.
 *
 * Three paths: Simulator (default), School drones (Wi-Fi / ESP JSON on UDP 14555), and
 * Radio (MAVLink). Radio stays in the tree for anyone who ever wants it; it is not this
 * school's path and it is not the default.
 */

export type ClassroomTelemetrySource = 'simulator' | 'esp' | 'mavlink'

const FILE_NAME = 'classroom-source.json'

export function classroomSourcePath(fromDir = dirname(fileURLToPath(import.meta.url))): string {
  return resolve(fromDir, '..', FILE_NAME)
}

export function isClassroomTelemetrySource(value: unknown): value is ClassroomTelemetrySource {
  return value === 'simulator' || value === 'esp' || value === 'mavlink'
}

export function readPreferredClassroomSource(
  path = classroomSourcePath(),
): ClassroomTelemetrySource {
  if (!existsSync(path)) return 'simulator'
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { source?: unknown }
    return isClassroomTelemetrySource(raw.source) ? raw.source : 'simulator'
  } catch {
    return 'simulator'
  }
}

export function writePreferredClassroomSource(
  source: ClassroomTelemetrySource,
  path = classroomSourcePath(),
): void {
  writeFileSync(path, `${JSON.stringify({ source }, null, 2)}\n`, 'utf8')
}

/**
 * What this process actually opened. Env overrides the preference file.
 */
export function resolveActiveClassroomSource(
  env: NodeJS.ProcessEnv = process.env,
  preferred = readPreferredClassroomSource(),
): ClassroomTelemetrySource {
  if (env['TELEMETRY_SOURCE'] === 'esp') return 'esp'
  if (env['TELEMETRY_SOURCE'] === 'mavlink') return 'mavlink'
  if (env['TELEMETRY_SOURCE'] === 'simulator') return 'simulator'
  return preferred
}
