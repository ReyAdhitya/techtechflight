import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Which Telemetry Source the classroom laptop prefers after the boss picks on Settings.
 *
 * Env `TELEMETRY_SOURCE` still wins for developers. Missing / corrupt file → simulator.
 * Writing here does not hot-swap a running process — restart the ground station.
 */

export type ClassroomTelemetrySource = 'simulator' | 'mavlink'

const FILE_NAME = 'classroom-source.json'

export function classroomSourcePath(fromDir = dirname(fileURLToPath(import.meta.url))): string {
  return resolve(fromDir, '..', FILE_NAME)
}

export function readPreferredClassroomSource(
  path = classroomSourcePath(),
): ClassroomTelemetrySource {
  if (!existsSync(path)) return 'simulator'
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { source?: unknown }
    return raw.source === 'mavlink' ? 'mavlink' : 'simulator'
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
  if (env['TELEMETRY_SOURCE'] === 'mavlink') return 'mavlink'
  if (env['TELEMETRY_SOURCE'] === 'simulator') return 'simulator'
  return preferred
}
