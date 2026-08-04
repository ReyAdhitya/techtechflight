import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  MISSION_BRIEFING_KEY,
  MISSION_BRIEFING_RULES,
  MISSION_BRIEFING_SECTIONS,
  MissionBriefing,
  isMissionBriefingComplete,
  readMissionBriefing,
  toggleMissionBriefRule,
} from './MissionBriefing'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

beforeEach(() => {
  window.localStorage.removeItem(MISSION_BRIEFING_KEY)
})

afterEach(() => {
  window.localStorage.removeItem(MISSION_BRIEFING_KEY)
})

describe('MissionBriefing', () => {
  it('renders all briefing sections with the done count at zero', () => {
    render(<MissionBriefing lessonId="lesson-1" scenarioId="search-rescue" />)

    expect(
      screen.getByRole('heading', { name: 'Mission rules and safety briefing' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === `0 of ${MISSION_BRIEFING_RULES.length} done`),
    ).toBeInTheDocument()

    for (const section of MISSION_BRIEFING_SECTIONS) {
      expect(screen.getByRole('heading', { name: section.title })).toBeInTheDocument()
      for (const rule of section.rules) {
        expect(
          screen.getByRole('button', { name: new RegExp(escapeRegExp(rule.label)) }),
        ).toBeInTheDocument()
      }
    }

    expect(screen.getByText('Search and Rescue')).toBeInTheDocument()
    expect(screen.getByText(/Locate a target/)).toBeInTheDocument()
    expect(screen.getAllByText('Still open')).toHaveLength(MISSION_BRIEFING_RULES.length)
  })

  it('ticks a rule with word and pressed state, and resets when the Lesson changes', () => {
    const { rerender } = render(<MissionBriefing lessonId="lesson-1" scenarioId="delivery" />)

    fireEvent.click(screen.getByRole('button', { name: /Never enter a hatched/i }))
    expect(screen.getByRole('button', { name: /Never enter a hatched/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === `1 of ${MISSION_BRIEFING_RULES.length} done`),
    ).toBeInTheDocument()

    rerender(<MissionBriefing lessonId="lesson-2" scenarioId="delivery" />)
    expect(
      screen.getByText((_, element) => element?.textContent === `0 of ${MISSION_BRIEFING_RULES.length} done`),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Never enter a hatched/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('persists ticks per Lesson in localStorage', () => {
    toggleMissionBriefRule('lesson-1', 'stop-now')
    toggleMissionBriefRule('lesson-1', 'hand-up')
    expect(readMissionBriefing('lesson-1').checked['stop-now']).toBe(true)
    expect(isMissionBriefingComplete(readMissionBriefing('lesson-1'))).toBe(false)
  })
})
