'use client'

import { useEffect, useState } from 'react'

/** Local lesson countdown banner for the camera wall. Persist later. */
export function LessonTimerBanner({
  initialSeconds = 45 * 60,
  onExpire,
}: {
  initialSeconds?: number
  onExpire?: () => void
}) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running || seconds <= 0) return
    const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [running, seconds])

  useEffect(() => {
    if (seconds === 0 && running) {
      setRunning(false)
      onExpire?.()
    }
  }, [seconds, running, onExpire])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-surface border border-hairline bg-surface-1 px-4 py-3"
      role="status"
      aria-label="Lesson timer"
    >
      <p className="tnum m-0 font-display text-summary font-medium text-ink">
        {mm}:{ss}
      </p>
      <button
        type="button"
        className="min-h-11 rounded-pill border border-hairline px-3 py-1.5 text-caption text-ink"
        onClick={() => setRunning((r) => !r)}
      >
        {running ? 'Pause' : 'Start'}
      </button>
      <button
        type="button"
        className="min-h-11 rounded-pill border border-hairline px-3 py-1.5 text-caption text-ink-subtle"
        onClick={() => {
          setRunning(false)
          setSeconds(initialSeconds)
        }}
      >
        Reset
      </button>
    </div>
  )
}
