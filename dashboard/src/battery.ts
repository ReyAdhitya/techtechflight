/** Battery as a whole-number percentage, never a voltage. */
export function formatBattery(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

/**
 * When a charging Drone is expected to be usable again.
 *
 * Carries the tilde for the same reason an estimated battery reading does: the number
 * is inferred rather than measured, and the board never lets an inference dress up as a
 * measurement. Says "Ready" because that is the Status being forecast — the same word a
 * Teacher will read on the tile when it arrives.
 */
export function formatTimeToReady(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000))
  if (minutes < 60) return `Ready in ~${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0
    ? `Ready in ~${hours} hr`
    : `Ready in ~${hours} hr ${remainder} min`
}
