/**
 * Skipped once is skipped for the rest of that Lesson.
 *
 * The warm-up is a full-screen minute over the start of a Lesson, and Skip is a Teacher saying
 * they do not need it today. It was React state on the panel that draws it, which is a fact
 * about a mounted component rather than about the morning: every visit back to step 1 inside
 * that first minute put the overlay over the Teacher again, and Skip had to be pressed each
 * time. A rail exists to be walked up and down, so this was one press per walk.
 *
 * Keyed to the Lesson, like the safety brief and every other side key, so tomorrow's class
 * still gets its warm-up. A Lesson with no id is the demonstration; it may be skipped too, and
 * `null` is a key like any other.
 */

export const WARM_UP_SKIP_KEY = 'techtechflight:warm-up-skipped'

/** The Lesson whose warm-up has been skipped, or absent. One Lesson, one answer. */
function readSkippedLesson(): string | null | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = window.localStorage.getItem(WARM_UP_SKIP_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { lessonId?: string | null }
    if (typeof parsed?.lessonId === 'string' || parsed?.lessonId === null) return parsed.lessonId
    return undefined
  } catch {
    return undefined
  }
}

export function warmUpSkipped(lessonId: string | null): boolean {
  const skipped = readSkippedLesson()
  return skipped !== undefined && skipped === lessonId
}

export function skipWarmUp(lessonId: string | null): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(WARM_UP_SKIP_KEY, JSON.stringify({ lessonId }))
  } catch {
    /* ignore */
  }
}

/** For tests, and for a Teacher starting the day again. */
export function clearWarmUpSkip(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(WARM_UP_SKIP_KEY)
  } catch {
    /* ignore */
  }
}
