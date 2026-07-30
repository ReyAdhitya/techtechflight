'use client'

import { useEffect, useState } from 'react'

/** 60s warm-up overlay after Lesson start before the running view takes over. */
export function LessonWarmUp({
  seconds = 60,
  onDone,
}: {
  seconds?: number
  onDone: () => void
}) {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (left <= 0) {
      onDone()
      return
    }
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [left, onDone])

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-canvas/95 p-8"
      role="dialog"
      aria-label="Lesson warm-up"
    >
      <p className="m-0 font-display text-summary font-medium text-ink">Warm-up</p>
      <p className="tnum m-0 font-display text-display font-medium text-ink">{left}</p>
      <p className="m-0 text-body text-ink-subtle">Seconds before the lesson is running.</p>
      <button
        type="button"
        className="min-h-11 rounded-pill border border-hairline px-4 py-1.5 text-caption text-ink"
        onClick={onDone}
      >
        Skip
      </button>
    </div>
  )
}
