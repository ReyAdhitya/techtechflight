/** Battery as a whole-number percentage, never a voltage. */
export function formatBattery(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}
