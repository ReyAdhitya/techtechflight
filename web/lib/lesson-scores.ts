/** Before/after lesson score pair — local Logbook fields. */
export type LessonScores = {
  readonly before: number | null
  readonly after: number | null
}

export function scoreDelta(scores: LessonScores): number | null {
  if (scores.before === null || scores.after === null) return null
  return scores.after - scores.before
}

export function formatScorePair(scores: LessonScores): string {
  const before = scores.before === null ? '—' : String(scores.before)
  const after = scores.after === null ? '—' : String(scores.after)
  const delta = scoreDelta(scores)
  if (delta === null) return `${before} → ${after}`
  const sign = delta > 0 ? '+' : ''
  return `${before} → ${after} (${sign}${delta})`
}
