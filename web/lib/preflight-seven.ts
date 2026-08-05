import type { DroneId, FleetThresholds, Telemetry } from '@techtechflight/contract'
import { DEFAULT_THRESHOLDS } from '@techtechflight/contract'
import { formatBatteryTimeBudget } from './battery-budget'
import { describeProximity } from './telemetry-presentation'

/**
 * The seven-item pre-flight check for one craft before a Mission.
 *
 * Six items read themselves from Telemetry; propellers is the one a Teacher ticks by hand.
 * An airframe that cannot report a reading says so in words — never a zero dressed as data.
 */

export const PRE_FLIGHT_SEVEN_KEY = 'techtechflight:preflight-seven'

/** Weak link — below this the Teacher should move before takeoff. */
export const LINK_QUALITY_WEAK = 0.25

export const PRE_FLIGHT_SEVEN_ITEMS = [
  { id: 'battery', label: 'Battery', manual: false },
  { id: 'propellers', label: 'Propellers', manual: true },
  { id: 'sensors', label: 'Sensors', manual: false },
  { id: 'wifi', label: 'Wi-Fi', manual: false },
  { id: 'camera', label: 'Camera', manual: false },
  { id: 'altitude-hold', label: 'Altitude hold', manual: false },
  { id: 'obstacle-sensing', label: 'Obstacle sensing', manual: false },
] as const

export type PreFlightSevenItemId = (typeof PRE_FLIGHT_SEVEN_ITEMS)[number]['id']

export type PreFlightSevenStatus = 'pass' | 'fail' | 'unreportable' | 'pending'

export interface PreFlightSevenReading {
  readonly id: PreFlightSevenItemId
  readonly label: string
  readonly manual: boolean
  readonly status: PreFlightSevenStatus
  /** Plain words for the Teacher — never colour alone (ADR-0004). */
  readonly detail: string
}

export type PreFlightSevenState = {
  readonly lessonId: string | null
  readonly propellers: Readonly<Partial<Record<DroneId, boolean>>>
}

export function emptyPreFlightSeven(lessonId: string | null): PreFlightSevenState {
  return { lessonId, propellers: {} }
}

function isDroneId(value: string): value is DroneId {
  return value.trim().length > 0
}

/** Load propeller ticks for this Lesson; a different Lesson id clears them. */
export function readPreFlightSeven(lessonId: string | null): PreFlightSevenState {
  if (typeof window === 'undefined') return emptyPreFlightSeven(lessonId)
  try {
    const raw = window.localStorage.getItem(PRE_FLIGHT_SEVEN_KEY)
    if (!raw) return emptyPreFlightSeven(lessonId)
    const parsed = JSON.parse(raw) as {
      lessonId?: string | null
      propellers?: Record<string, boolean>
    }
    if (parsed.lessonId !== lessonId) return emptyPreFlightSeven(lessonId)
    const propellers: Partial<Record<DroneId, boolean>> = {}
    for (const [id, value] of Object.entries(parsed.propellers ?? {})) {
      if (isDroneId(id) && value === true) propellers[id] = true
    }
    return { lessonId, propellers }
  } catch {
    return emptyPreFlightSeven(lessonId)
  }
}

function writePreFlightSeven(state: PreFlightSevenState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRE_FLIGHT_SEVEN_KEY, JSON.stringify(state))
}

export function propellersTicked(
  state: PreFlightSevenState,
  droneId: DroneId,
): boolean {
  return state.propellers[droneId] === true
}

/** Flip the propeller tick for this craft and Lesson. */
export function togglePropellersTick(
  lessonId: string | null,
  droneId: DroneId,
): PreFlightSevenState {
  const current = readPreFlightSeven(lessonId)
  const nextPropellers = { ...current.propellers }
  if (nextPropellers[droneId]) delete nextPropellers[droneId]
  else nextPropellers[droneId] = true
  const next: PreFlightSevenState = { lessonId, propellers: nextPropellers }
  writePreFlightSeven(next)
  return next
}

export function resetPreFlightSeven(lessonId: string | null): PreFlightSevenState {
  const next = emptyPreFlightSeven(lessonId)
  writePreFlightSeven(next)
  return next
}

function reading(
  id: PreFlightSevenItemId,
  label: string,
  manual: boolean,
  status: PreFlightSevenStatus,
  detail: string,
): PreFlightSevenReading {
  return { id, label, manual, status, detail }
}

function batteryReading(
  telemetry: Telemetry | null,
  thresholds: FleetThresholds,
): PreFlightSevenReading {
  const meta = PRE_FLIGHT_SEVEN_ITEMS[0]
  if (telemetry === null) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'unreportable',
      'No Telemetry yet. Confirm the craft is powered and in range.',
    )
  }
  const fraction = telemetry.batteryFraction
  if (fraction < thresholds.usableBatteryFraction) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'fail',
      'Place on charge before issue.',
    )
  }
  const estimate = telemetry.batteryIsEstimate ? ' (estimated)' : ''
  return reading(
    meta.id,
    meta.label,
    meta.manual,
    'pass',
    `Charge sufficient${estimate} · ${formatBatteryTimeBudget(fraction)}`,
  )
}

function propellersReading(ticked: boolean): PreFlightSevenReading {
  const meta = PRE_FLIGHT_SEVEN_ITEMS[1]
  if (!ticked) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'pending',
      'Visually confirm propellers are secure, then tick when done.',
    )
  }
  return reading(
    meta.id,
    meta.label,
    meta.manual,
    'pass',
    'Propellers checked by hand.',
  )
}

function sensorsReading(telemetry: Telemetry | null): PreFlightSevenReading {
  const meta = PRE_FLIGHT_SEVEN_ITEMS[2]
  if (telemetry === null) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'unreportable',
      'No Telemetry yet. Cannot verify sensors.',
    )
  }
  if (telemetry.fault !== null) {
    return reading(meta.id, meta.label, meta.manual, 'fail', telemetry.fault.description)
  }
  if (telemetry.orientation === undefined) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'unreportable',
      'Motion sensors not reporting on this airframe.',
    )
  }
  return reading(meta.id, meta.label, meta.manual, 'pass', 'Motion sensors responding.')
}

function wifiReading(telemetry: Telemetry | null): PreFlightSevenReading {
  const meta = PRE_FLIGHT_SEVEN_ITEMS[3]
  if (telemetry === null) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'unreportable',
      'No Telemetry yet. Cannot verify the link.',
    )
  }
  if (!('linkQuality' in telemetry) || telemetry.linkQuality === undefined) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'unreportable',
      'Link cannot report signal strength on this airframe.',
    )
  }
  const quality = telemetry.linkQuality
  const percent = Math.round(quality * 100)
  if (quality < LINK_QUALITY_WEAK) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'fail',
      `Signal weak at ${percent}%. Move closer to the access point.`,
    )
  }
  return reading(
    meta.id,
    meta.label,
    meta.manual,
    'pass',
    `Signal OK at ${percent}%.`,
  )
}

function cameraReading(telemetry: Telemetry | null): PreFlightSevenReading {
  const meta = PRE_FLIGHT_SEVEN_ITEMS[4]
  if (telemetry === null) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'unreportable',
      'No Telemetry yet. Cannot verify the camera.',
    )
  }
  if (telemetry.camera === undefined) {
    return reading(meta.id, meta.label, meta.manual, 'unreportable', 'No camera fitted.')
  }
  if (telemetry.camera.streaming) {
    return reading(meta.id, meta.label, meta.manual, 'pass', 'Camera fitted and streaming.')
  }
  return reading(meta.id, meta.label, meta.manual, 'pass', 'Camera fitted. Ready to start.')
}

function altitudeHoldReading(telemetry: Telemetry | null): PreFlightSevenReading {
  const meta = PRE_FLIGHT_SEVEN_ITEMS[5]
  if (telemetry === null) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'unreportable',
      'No Telemetry yet. Cannot verify altitude hold.',
    )
  }
  const raw = telemetry.extra?.altitudeHold
  if (raw === undefined) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'unreportable',
      'This airframe cannot report altitude hold.',
    )
  }
  if (raw === false) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'fail',
      'Altitude hold is not ready. Check the flight controller.',
    )
  }
  return reading(meta.id, meta.label, meta.manual, 'pass', 'Altitude hold ready.')
}

function obstacleReading(telemetry: Telemetry | null): PreFlightSevenReading {
  const meta = PRE_FLIGHT_SEVEN_ITEMS[6]
  if (telemetry === null) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'unreportable',
      'No Telemetry yet. Cannot verify obstacle sensing.',
    )
  }
  if (!('proximity' in telemetry)) {
    return reading(
      meta.id,
      meta.label,
      meta.manual,
      'unreportable',
      describeProximity(undefined).text,
    )
  }
  const described = describeProximity(telemetry.proximity)
  return reading(
    meta.id,
    meta.label,
    meta.manual,
    'pass',
    `Sensor fitted · ${described.text}`,
  )
}

/** Evaluate all seven items for one craft. Order is fixed (DELIBERATE-POSITIONS 1). */
export function evaluatePreFlightSeven(
  telemetry: Telemetry | null,
  propellersChecked: boolean,
  thresholds: FleetThresholds = DEFAULT_THRESHOLDS,
): readonly PreFlightSevenReading[] {
  return [
    batteryReading(telemetry, thresholds),
    propellersReading(propellersChecked),
    sensorsReading(telemetry),
    wifiReading(telemetry),
    cameraReading(telemetry),
    altitudeHoldReading(telemetry),
    obstacleReading(telemetry),
  ]
}

export function preFlightSevenDoneCount(
  readings: readonly PreFlightSevenReading[],
): number {
  return readings.filter((item) => item.status === 'pass').length
}

export function isPreFlightSevenDone(
  readings: readonly PreFlightSevenReading[],
): boolean {
  return preFlightSevenDoneCount(readings) === PRE_FLIGHT_SEVEN_ITEMS.length
}

export function preFlightSevenStatusWord(status: PreFlightSevenStatus): string {
  switch (status) {
    case 'pass':
      return 'OK'
    case 'fail':
      return 'Not ready'
    case 'unreportable':
      return 'Cannot report'
    case 'pending':
      return 'Still open'
  }
}
