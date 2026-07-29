/**
 * Where each Scope Drone Name sits relative to its mark (#61).
 *
 * Owner wants the name **above** the mark on top-down — not alternating above/below —
 * without labels stacking into an unreadable pile when craft sit a metre apart. Vertical
 * alternation is gone on plan view; close marks get a horizontal rem stagger instead.
 * Names are never dropped (anonymous dots are out of scope for this surface).
 *
 * Elevation keeps the older “toward the middle of the box” vertical rule so grounded
 * labels are not clipped under the frame; the same horizontal stagger applies there.
 */

export type ScopeLabelPlacement = {
  readonly vertical: 'above' | 'below'
  /** Signed rem offset after centring on the mark. `0` is dead centre. */
  readonly nudgeXRem: number
}

export type ScopeLabelMark = {
  readonly id: string
  readonly xPercent: number
  readonly yPercent: number
}

/** ~1.1 m in an 8 m window — classroom spacing that used to collide on one line. */
export const SCOPE_LABEL_CLOSE_PERCENT = 14

/** One rem step between neighbours in a crowded cluster (ADR-0008 — not px). */
export const SCOPE_LABEL_NUDGE_STEP_REM = 1

/**
 * Placement for every mark in the current Scope picture.
 *
 * @param view `'top-down'` always stacks names above; `'elevation'` aims toward the
 *   vertical centre of the box (above low marks, below high ones).
 */
export function scopeLabelPlacements(
  marks: readonly ScopeLabelMark[],
  view: 'top-down' | 'elevation',
): ReadonlyMap<string, ScopeLabelPlacement> {
  const sorted = [...marks].sort((a, b) => {
    if (a.xPercent !== b.xPercent) return a.xPercent - b.xPercent
    if (a.yPercent !== b.yPercent) return a.yPercent - b.yPercent
    return a.id.localeCompare(b.id)
  })

  const result = new Map<string, ScopeLabelPlacement>()
  let cluster: ScopeLabelMark[] = []

  const flush = () => {
    if (cluster.length === 0) return
    const n = cluster.length
    for (let i = 0; i < n; i++) {
      const mark = cluster[i]!
      const nudgeXRem = n === 1 ? 0 : (i - (n - 1) / 2) * SCOPE_LABEL_NUDGE_STEP_REM
      const vertical =
        view === 'top-down' ? 'above' : mark.yPercent < 50 ? 'below' : 'above'
      result.set(mark.id, { vertical, nudgeXRem })
    }
    cluster = []
  }

  for (const mark of sorted) {
    const prev = cluster[cluster.length - 1]
    if (
      prev &&
      (Math.abs(mark.xPercent - prev.xPercent) > SCOPE_LABEL_CLOSE_PERCENT ||
        Math.abs(mark.yPercent - prev.yPercent) > SCOPE_LABEL_CLOSE_PERCENT)
    ) {
      flush()
    }
    cluster.push(mark)
  }
  flush()

  return result
}
