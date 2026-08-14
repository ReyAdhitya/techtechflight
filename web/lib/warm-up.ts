/**
 * Whether a Teacher has skipped this Lesson's warm-up.
 *
 * The warm-up is the first minute of a Lesson, shown as a full-screen countdown. Skip used to
 * be React state on the component that draws it, so it lasted exactly as long as that
 * component stayed mounted: going back to step 1 replayed the countdown over a class already
 * flying, and a Teacher who skipped it once skipped it again every time they looked at their
 * own set-up.
 *
 * Keyed on the **Lesson**, and in `localStorage`, for the same reason the countdown itself is
 * computed from `lesson.startedAt` rather than a tab flag: skipping is a decision about this
 * morning's Lesson, not about this tab. It survives a remount, a second tab and a reload, and
 * the next Lesson starts with its own minute.
 *
 * One id, not a list. Two Lessons are never warming up at once, and a growing list of every
 * Lesson a laptop has ever run is a record nobody asked for.
 */

export const WARM_UP_SKIPPED_KEY = 'techtechflight:warm-up-skipped'

export function warmUpSkipped(lessonId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(WARM_UP_SKIPPED_KEY) === lessonId
  } catch {
    /* A locked-down school browser can refuse storage. The countdown is not worth failing on. */
    return false
  }
}

export function skipWarmUp(lessonId: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(WARM_UP_SKIPPED_KEY, lessonId)
  } catch {
    /* See above. The overlay still goes away for as long as this screen is mounted. */
  }
}

/** Test helper. */
export function clearWarmUpSkipped(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(WARM_UP_SKIPPED_KEY)
  } catch {
    /* ignore */
  }
}
