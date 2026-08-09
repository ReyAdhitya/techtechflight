import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook } from '@/lib/logbook'
import { MISSION_DRAFT_KEY, readMission } from '@/lib/mission-draft'
import { assignDroneToTeam, createTeam, readTeams } from '@/lib/teams'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { LessonScreen } from './LessonScreen'

/**
 * Mission set-up on one scrolling Lesson page — no step rail, no `?step=`.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useSearchParams: () => new URLSearchParams(),
}))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

const lesson = () =>
  render(
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>
      <LessonScreen />
    </FleetProvider>,
  )

beforeEach(() => {
  clearLogbook()
  window.localStorage.removeItem('techtechflight:teams')
  window.localStorage.removeItem(MISSION_DRAFT_KEY)
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  window.localStorage.removeItem('techtechflight:teams')
  window.localStorage.removeItem(MISSION_DRAFT_KEY)
})

describe('mission set-up on one page', () => {
  it('shows Scenario, area, teams, pre-flight and briefing together', () => {
    lesson()
    settle()

    expect(screen.getByRole('heading', { name: 'Set this Mission up' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Choose the Mission Scenario' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Draw the No-fly Zones' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Teams and Drones' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pre-flight check' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Mission rules and safety briefing' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start the lesson/i })).toBeInTheDocument()
  })

  it('has no Mission step rail', () => {
    lesson()
    settle()

    expect(screen.queryByRole('navigation', { name: /Mission steps/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Step\s*1\s*of\s*12/)).not.toBeInTheDocument()
  })

  it('keeps the Scenario when the Teacher walks away from the screen', () => {
    lesson()
    settle()

    fireEvent.click(screen.getByRole('button', { name: /Search and Rescue/i }))

    expect(readMission(null)?.scenarioId).toBe('search-rescue')
  })

  it('runs pre-flight for every craft a team has taken, not just the first', () => {
    createTeam('Red Team')
    createTeam('Blue Team')
    const [red, blue] = readTeams()
    assignDroneToTeam(red!.id, 'ttf-0001')
    assignDroneToTeam(blue!.id, 'ttf-0002')

    lesson()
    settle()

    expect(screen.getAllByText(/Propellers is the only one you tick/i)).toHaveLength(2)
  })

  it('says so plainly when there is no craft to check', () => {
    lesson()
    settle()

    expect(screen.getByText(/No craft on a team yet/i)).toBeInTheDocument()
  })

  it('leaves the Fleet reading to one line', () => {
    lesson()
    settle()

    expect(screen.getByRole('link', { name: /serviceable/ })).toHaveAttribute('href', '/')
  })
})
