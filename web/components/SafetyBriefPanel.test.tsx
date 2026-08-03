import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SAFETY_BRIEF_KEY, SAFETY_BRIEF_RULES } from '@/lib/safety-brief'
import { SafetyBriefPanel } from './SafetyBriefPanel'

beforeEach(() => {
  window.localStorage.removeItem(SAFETY_BRIEF_KEY)
})

afterEach(() => {
  window.localStorage.removeItem(SAFETY_BRIEF_KEY)
})

describe('SafetyBriefPanel', () => {
  it('renders the fixed rule list with the done count at zero', () => {
    render(<SafetyBriefPanel lessonId="lesson-1" />)

    expect(screen.getByRole('heading', { name: 'Safety brief' })).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === `0 of ${SAFETY_BRIEF_RULES.length} done`),
    ).toBeInTheDocument()
    for (const rule of SAFETY_BRIEF_RULES) {
      expect(screen.getByRole('button', { name: new RegExp(rule.label) })).toBeInTheDocument()
    }
    expect(screen.getAllByText('Still open')).toHaveLength(SAFETY_BRIEF_RULES.length)
  })

  it('ticks a rule with word and pressed state, and resets when the Lesson changes', () => {
    const { rerender } = render(<SafetyBriefPanel lessonId="lesson-1" />)

    fireEvent.click(screen.getByRole('button', { name: /propellers/i }))
    expect(screen.getByRole('button', { name: /propellers/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === `1 of ${SAFETY_BRIEF_RULES.length} done`),
    ).toBeInTheDocument()

    rerender(<SafetyBriefPanel lessonId="lesson-2" />)
    expect(
      screen.getByText((_, element) => element?.textContent === `0 of ${SAFETY_BRIEF_RULES.length} done`),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /propellers/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
