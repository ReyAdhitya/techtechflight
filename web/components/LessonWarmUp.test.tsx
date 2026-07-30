import { act, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LessonWarmUp } from './LessonWarmUp'

/**
 * Reproduces the Fleet clock problem: parent re-renders every tick with a fresh
 * `onDone`, which must not reset the warm-up countdown.
 */
function TickingHost() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 200)
    return () => window.clearInterval(id)
  }, [])
  return <LessonWarmUp seconds={60} onDone={() => {}} />
}

describe('LessonWarmUp', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts down even when the parent re-renders with a new onDone each tick', () => {
    render(<TickingHost />)

    expect(screen.getByText('60')).toBeInTheDocument()

    for (let i = 0; i < 3; i += 1) {
      act(() => {
        vi.advanceTimersByTime(1_000)
      })
    }

    expect(screen.getByText('57')).toBeInTheDocument()
  })
})
