import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LessonTimerBanner } from './LessonTimerBanner'

describe('LessonTimerBanner', () => {
  it('starts paused and can start', () => {
    vi.useFakeTimers()
    render(<LessonTimerBanner initialSeconds={120} />)
    expect(screen.getByLabelText('Lesson timer')).toHaveTextContent('02:00')
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    vi.useRealTimers()
  })
})
