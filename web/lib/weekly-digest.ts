export type DigestLesson = { readonly label: string; readonly startedAt: number; readonly endedAt: number | null }

export function lessonsInLastDays(lessons: readonly DigestLesson[], days = 7, now = Date.now()) {
  const since = now - days * 24 * 60 * 60 * 1000
  return lessons.filter((l) => l.startedAt >= since)
}

export function formatWeeklyDigest(lessons: readonly DigestLesson[], now = Date.now()): string {
  const week = lessonsInLastDays(lessons, 7, now)
  const closed = week.filter((l) => l.endedAt !== null)
  return `${closed.length} lessons finished this week · ${week.length} started`
}
