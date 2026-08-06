'use client'

/**
 * Live airborne / grounded headcount for Control.
 */
export function LiveHeadcount({
  airborne,
  grounded,
}: {
  airborne: number
  grounded: number
}) {
  return (
    <p className="m-0 text-body text-ink-subtle" role="status" aria-label="Live headcount">
      <span className="tnum font-medium text-ink">{airborne}</span> airborne,{' '}
      <span className="tnum font-medium text-ink">{grounded}</span> grounded
    </p>
  )
}
