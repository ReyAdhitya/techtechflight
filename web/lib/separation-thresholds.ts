import { SEPARATION_WARNING_M } from '@/lib/vitals'

/**
 * Teacher-tunable separation alarm distance.
 *
 * Today's board hard-codes `SEPARATION_WARNING_M` (1.5 m) in vitals. This module keeps that
 * value as the default and lets Settings remember a different metre number in this browser
 * so a School can tighten or loosen the alarm without a code change. The Integrator wires
 * `readSeparationThresholdM()` into proximity / Attention; this ticket does not remount.
 */

export const SEPARATION_THRESHOLD_KEY = 'techtechflight:separation-threshold-m'

/** Same number the board already uses — the default until a Teacher changes it. */
export const DEFAULT_SEPARATION_THRESHOLD_M = SEPARATION_WARNING_M

const MIN_M = 0.5
const MAX_M = 10

export function clampSeparationThresholdM(metres: number): number {
  if (!Number.isFinite(metres)) return DEFAULT_SEPARATION_THRESHOLD_M
  return Math.min(MAX_M, Math.max(MIN_M, metres))
}

export function parseSeparationThresholdM(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number.parseFloat(trimmed)
  if (!Number.isFinite(parsed)) return null
  return clampSeparationThresholdM(parsed)
}

export function readSeparationThresholdM(): number {
  if (typeof window === 'undefined') return DEFAULT_SEPARATION_THRESHOLD_M
  try {
    const raw = window.localStorage.getItem(SEPARATION_THRESHOLD_KEY)
    if (raw === null) return DEFAULT_SEPARATION_THRESHOLD_M
    const parsed = parseSeparationThresholdM(raw)
    return parsed ?? DEFAULT_SEPARATION_THRESHOLD_M
  } catch {
    return DEFAULT_SEPARATION_THRESHOLD_M
  }
}

export function writeSeparationThresholdM(metres: number): void {
  if (typeof window === 'undefined') return
  const next = clampSeparationThresholdM(metres)
  try {
    window.localStorage.setItem(SEPARATION_THRESHOLD_KEY, String(next))
  } catch {
    // Locked-down school browsers can refuse storage; callers still use the default.
  }
}

export function resetSeparationThresholdM(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SEPARATION_THRESHOLD_KEY)
  } catch {
    // See above.
  }
}

export function isBelowSeparationThreshold(
  separationM: number | null,
  thresholdM: number = DEFAULT_SEPARATION_THRESHOLD_M,
): boolean {
  if (separationM === null) return false
  return separationM < thresholdM
}

export function formatSeparationThresholdM(metres: number): string {
  const rounded = Math.round(metres * 10) / 10
  return `${rounded} m`
}
