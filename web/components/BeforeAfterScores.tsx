'use client'

import { formatScorePair, type LessonScores } from '@/lib/lesson-scores'

export function BeforeAfterScores({ scores }: { scores: LessonScores }) {
  return (
    <p className="m-0 text-value text-ink-subtle" aria-label="Before after scores">
      Scores {formatScorePair(scores)}
    </p>
  )
}
