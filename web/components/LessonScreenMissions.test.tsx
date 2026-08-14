import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook } from '@/lib/logbook'
import { MISSION_DRAFT_KEY, chooseScenario, readMission } from '@/lib/mission-draft'
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

/**
 * Putting a team on a craft has to reach this screen without a reload.
 *
 * `readTeams()` was called during render, so the screen only noticed a team getting a Drone
 * when something else happened to re-render it. Choosing the Drone left "Put these craft on
 * the Mission" absent: the team had the craft, the Mission did not, and the only way through
 * was a refresh nobody would guess at. It is a subscription now, the way the Logbook is.
 */
describe('a team getting a craft, without a reload', () => {
  it('offers the craft to the Mission as soon as the team has one', () => {
    chooseScenario(null, 'search-rescue')
    createTeam('Red Team')
    const teamId = readTeams()[0]!.id

    lesson()
    settle()
    expect(
      screen.queryByRole('button', { name: /craft on the Mission/i }),
    ).not.toBeInTheDocument()

    act(() => {
      assignDroneToTeam(teamId, 'ttf-0001')
    })
    settle()

    expect(screen.getByRole('button', { name: /craft on the Mission/i })).toBeInTheDocument()
  })

  /* And the whole point of the button: pressing it writes the craft onto the Mission. */
  it('writes the craft onto the Mission when pressed', () => {
    chooseScenario(null, 'search-rescue')
    createTeam('Red Team')
    const teamId = readTeams()[0]!.id
    lesson()
    settle()

    act(() => {
      assignDroneToTeam(teamId, 'ttf-0001')
    })
    settle()
    fireEvent.click(screen.getByRole('button', { name: /craft on the Mission/i }))
    settle()

    expect(readMission(null)?.droneIds ?? []).toContain('ttf-0001')
  })
})

/**
 * The tick has to reach the panels it is about.
 *
 * The button wrote the tick for every craft and then left the screen, having done its job,
 * while every seven-item panel under it went on saying *Visually confirm propellers are
 * secure*: a Teacher who had just walked the bench was looking at six panels disagreeing with
 * them, on the step whose whole content is those panels.
 */
describe('the tick-all reaching the panels below it', () => {
  const twoCraftOnTeams = () => {
    createTeam('Red Team')
    createTeam('Blue Team')
    const [red, blue] = readTeams()
    assignDroneToTeam(red!.id, 'ttf-0001')
    assignDroneToTeam(blue!.id, 'ttf-0002')
  }

  it('shows every craft as checked after one press', () => {
    twoCraftOnTeams()
    lesson()
    settle()

    fireEvent.click(screen.getByRole('button', { name: /Propellers checked on all/ }))
    settle()

    expect(screen.getAllByText('Propellers checked by hand.')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Propellers checked on all/ })).not
      .toBeInTheDocument()
  })
})
