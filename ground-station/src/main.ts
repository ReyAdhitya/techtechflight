import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { FleetThresholds } from '@techtechflight/contract'
import { DEFAULT_THRESHOLDS } from '@techtechflight/contract'
import { SystemClock } from '@techtechflight/contract/testing'
import { GroundStation } from './fleet.ts'
import { startFleetServer } from './server.ts'
import { CLASSROOM_FLEET } from './simulator/classroom-fleet.ts'
import { SimulatedTelemetrySource } from './simulator/simulated-telemetry-source.ts'

const here = dirname(fileURLToPath(import.meta.url))
const dashboardDist = resolve(here, '../../dashboard/dist')

const clock = new SystemClock()

const simulator = new SimulatedTelemetrySource({
  registrations: CLASSROOM_FLEET,
  clock,
  reportIntervalMs: 1_000,
})

const station = new GroundStation({
  registrations: CLASSROOM_FLEET,
  source: simulator,
  clock,
  // Both time thresholds are configurable, per the spec. How long a Drone may be quiet
  // before its Telemetry stops being trustworthy is a property of the room and the
  // radio, not something to recompile for.
  thresholds: readThresholds(),
})

function readThresholds(): FleetThresholds {
  const thresholds: FleetThresholds = {
    staleAfterMs: numberFrom('STALE_AFTER_MS', DEFAULT_THRESHOLDS.staleAfterMs),
    offlineAfterMs: numberFrom('OFFLINE_AFTER_MS', DEFAULT_THRESHOLDS.offlineAfterMs),
    usableBatteryFraction: numberFrom(
      'USABLE_BATTERY_FRACTION',
      DEFAULT_THRESHOLDS.usableBatteryFraction,
    ),
  }

  // Telemetry has to stop being trustworthy before the Drone stops being in contact.
  // The other way round, a Drone would go Offline while its readings still claimed to
  // be current — the one thing the board promises never to show.
  if (thresholds.staleAfterMs >= thresholds.offlineAfterMs) {
    throw new Error(
      `STALE_AFTER_MS (${thresholds.staleAfterMs}) must be shorter than ` +
        `OFFLINE_AFTER_MS (${thresholds.offlineAfterMs})`,
    )
  }

  return thresholds
}

function numberFrom(variable: string, fallback: number): number {
  const raw = process.env[variable]
  if (raw === undefined) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(`${variable}="${raw}" is not a positive number — using ${fallback}`)
    return fallback
  }
  return parsed
}

station.start()

const server = await startFleetServer({
  station,
  port: Number(process.env['PORT'] ?? 4321),
  ...(existsSync(dashboardDist) ? { dashboardDir: dashboardDist } : {}),
})

console.log(`Ground station listening on http://localhost:${server.port}`)
console.log(`Fleet State stream at ws://localhost:${server.port}/fleet`)
if (!existsSync(dashboardDist)) {
  console.log('Dashboard not built — run `npm run dev:dashboard` for the board.')
}

installScenarioKeys()

/**
 * Scenario triggers for a demonstration, driven from this terminal.
 *
 * Deliberately on the ground station's stdin rather than the socket: the dashboard is
 * read-only and this spec has no command path, so a demo affordance must not become one.
 */
function installScenarioKeys(): void {
  const input = process.stdin
  if (!input.isTTY) return

  const target = CLASSROOM_FLEET[0]!.id
  const actions: Record<string, { label: string; run: () => void }> = {
    f: { label: `Fault on ${target}`, run: () => simulator.injectFault(target) },
    c: { label: `Clear fault on ${target}`, run: () => simulator.clearFault(target) },
    l: { label: `Lose link to ${target}`, run: () => simulator.loseLink(target) },
    r: { label: `Restore link to ${target}`, run: () => simulator.restoreLink(target) },
    t: { label: `Take off ${target}`, run: () => simulator.takeOff(target) },
    d: { label: `Land ${target}`, run: () => simulator.land(target) },
    b: { label: `Flatten battery on ${target}`, run: () => simulator.setBattery(target, 0.08) },
  }

  console.log(
    `\nDemo keys: ${Object.entries(actions)
      .map(([key, action]) => `${key} = ${action.label}`)
      .join('  |  ')}  |  q = quit\n`,
  )

  input.setRawMode(true)
  input.resume()
  input.setEncoding('utf8')
  input.on('data', (chunk: string) => {
    const key = chunk.toLowerCase()
    if (key === 'q' || chunk === '') {
      void shutdown()
      return
    }
    const action = actions[key]
    if (!action) return
    action.run()
    console.log(`→ ${action.label}`)
  })
}

async function shutdown(): Promise<void> {
  station.stop()
  await server.close()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
