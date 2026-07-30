'use client'

import { formatYoloScore, yoloLessonScore } from '@/lib/yolo-lesson-score'

/** Glanceable class YOLO score from per-drone detection tallies. */
export function YoloLessonScoreStrip({ counts }: { counts: readonly number[] }) {
  const score = yoloLessonScore(counts)
  return (
    <p className="m-0 text-body text-ink-subtle" role="status" aria-label="YOLO lesson score">
      YOLO class score:{' '}
      <span className="tnum font-medium text-ink">{formatYoloScore(score)}</span>
    </p>
  )
}
