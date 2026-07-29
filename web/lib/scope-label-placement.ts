/**
 * Where each Scope Drone Name sits relative to its mark (#61 / #86).
 *
 * Owner wants the name **above** the mark on top-down — not alternating above/below —
 * without labels stacking into an unreadable pile when craft sit a metre apart. Vertical
 * alternation is gone on plan view; close marks get a horizontal rem stagger instead.
 * Names are never dropped (anonymous dots are out of scope for this surface).
 *
 * Elevation (Side / Front) keeps “toward the middle of the box” when marks are alone.
 * When several craft share one spot — same east on Front, same height — horizontal rem
 * stagger alone still collides (“Drone 8” on “Drone 8”). Those piles get a **vertical**
 * rem stack away from the mark instead (#86). Grounded piles stay above the mark so
 * names never paint into the “Filled = flying” footer.
 */

export type ScopeLabelPlacement = {
  readonly vertical: 'above' | 'below'
  /** Signed rem offset after centring on the mark. `0` is dead centre. */
  readonly nudgeXRem: number
  /**
   * Extra rem away from the mark along the label stack (elevation coincident piles).
   * `0` on top-down and on solitary elevation marks.
   */
  readonly nudgeYRem: number
}

export type ScopeLabelMark = {
  readonly id: string
  readonly xPercent: number
  readonly yPercent: number
}

/** ~1.1 m in an 8 m window — classroom spacing that used to collide on one line. */
export const SCOPE_LABEL_CLOSE_PERCENT = 14

/** One rem step between neighbours in a crowded top-down cluster (ADR-0008 — not px). */
export const SCOPE_LABEL_NUDGE_STEP_REM = 1

/**
 * Wider step on elevation when neighbours share a height but not the exact same pixel —
 * “Drone N” is wider than 1 rem at `--text-label`.
 */
export const SCOPE_LABEL_ELEVATION_NUDGE_STEP_REM = 2.75

/** Same Front/Side column and height — treat as one pile and stack names vertically. */
export const SCOPE_LABEL_COINCIDENT_PERCENT = 3

/** Rough height of a name + `0.0 m` block at label size (leading-tight). */
export const SCOPE_LABEL_STACK_STEP_REM = 1.85

/** Ground line region — never flip labels below the mark into the figcaption. */
const NEAR_FLOOR_PERCENT = 72

/**
 * Placement for every mark in the current Scope picture.
 *
 * @param view `'top-down'` always stacks names above; `'elevation'` aims toward the
 *   vertical centre of the box (above low marks, below high ones), except coincident
 *   piles which stack vertically away from the mark.
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

    if (view === 'top-down') {
      for (let i = 0; i < n; i++) {
        const mark = cluster[i]!
        const nudgeXRem = n === 1 ? 0 : (i - (n - 1) / 2) * SCOPE_LABEL_NUDGE_STEP_REM
        result.set(mark.id, { vertical: 'above', nudgeXRem, nudgeYRem: 0 })
      }
      cluster = []
      return
    }

    const xs = cluster.map((m) => m.xPercent)
    const ys = cluster.map((m) => m.yPercent)
    const spanX = Math.max(...xs) - Math.min(...xs)
    const spanY = Math.max(...ys) - Math.min(...ys)
    const coincident =
      n > 1 && spanX <= SCOPE_LABEL_COINCIDENT_PERCENT && spanY <= SCOPE_LABEL_COINCIDENT_PERCENT
    const nearFloor = ys.every((y) => y >= NEAR_FLOOR_PERCENT)

    for (let i = 0; i < n; i++) {
      const mark = cluster[i]!
      const vertical: 'above' | 'below' = nearFloor
        ? 'above'
        : mark.yPercent < 50
          ? 'below'
          : 'above'

      if (coincident) {
        result.set(mark.id, {
          vertical,
          nudgeXRem: 0,
          nudgeYRem: i * SCOPE_LABEL_STACK_STEP_REM,
        })
      } else {
        const nudgeXRem =
          n === 1 ? 0 : (i - (n - 1) / 2) * SCOPE_LABEL_ELEVATION_NUDGE_STEP_REM
        result.set(mark.id, { vertical, nudgeXRem, nudgeYRem: 0 })
      }
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
