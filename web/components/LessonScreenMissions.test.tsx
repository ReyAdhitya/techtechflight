import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook } from '@/lib/logbook'
import { MISSION_DRAFT_KEY, readMission } from '@/lib/mission-draft'
import { assignDroneToTeam, createTeam, readTeams } from '@/lib/teams'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { LessonScreen } from './LessonScreen'

/**
 * Mission set-up on the Lesson screen, one step at a time.
 *
 * This was a single column of five blocks that appeared as their turn came. A Teacher
 * part-way down it could not tell how much was left, could not go back to change an
 * answer, and lost the Scenario and the zones the moment they walked to Control. The five
 * blocks are the same; what is asserted here is that one is on screen at a time, that the
 * step is in the URL, and that the work survives the screen.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
// The Lesson screen reads its set-up step from `?step=`.
const search = vi.hoisted(() => ({ current: new URLSearchParams() }))
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useSearchParams: () => search.current,
}))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

const atStep = (step: number | null) => {
  search.current = new URLSearchParams(step === null ? '' : `step=${step}`)
  return render(
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>
      <LessonScreen />
    </FleetProvider>,
  )
}

beforeEach(() => {
  clearLogbook()
  window.localStorage.removeItem('techtechflight:teams')
  window.localStorage.removeItem(MISSION_DRAFT_KEY)
  pathname.current = '/demo'
  search.current = new URLSearchParams()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  window.localStorage.removeItem('techtechflight:teams')
  window.localStorage.removeItem(MISSION_DRAFT_KEY)
})

describe('mission set-up, one step at a time', () => {
  it('opens on the Scenario, and says which step that is', () => {
    atStep(null)
    settle()

    expect(screen.getByText(/Step\s*1\s*of\s*12/)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Mission Scenario' })).toBeInTheDocument()
    // The next block is not underneath it waiting to be scrolled past.
    expect(screen.queryByRole('region', { name: 'Mission area' })).not.toBeInTheDocument()
  })

  /*
   * The step is the screen. It was briefly a header on top of the old long page, with
   * serviceable counts, the plan wizard, assignment and Start the lesson all still stacked
   * underneath, which is exactly the scroll the twelve steps exist to replace.
   *
   * The answer was a disclosure summarised "Start a Lesson, and the rest of the day",
   * carried on every step. Carried is the part that was wrong: on step 4 it read as a
   * drawer of unexplained work under the one thing the Teacher was being asked to do. It
   * is the top of the day, so it belongs on step 1 and nowhere else.
   */
  it('keeps the rest of the day on step 1, in the open', () => {
    atStep(1)
    settle()

    expect(screen.queryByText(/Start a Lesson, and the rest of the day/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start the lesson/i })).toBeInTheDocument()
  })

  it('leaves the rest of the day off the later steps entirely', () => {
    atStep(2)
    settle()

    expect(screen.queryByRole('button', { name: /Start the lesson/i })).not.toBeInTheDocument()
  })

  it('names the step as the work, not as the noun the rail uses', () => {
    atStep(1)
    settle()

    expect(
      screen.getByRole('heading', { name: 'Choose the Mission Scenario' }),
    ).toBeInTheDocument()
    // The why paragraph under the title is gone; the title is the step (#617).
    expect(screen.queryByText(/The objective, what counts as success/i)).not.toBeInTheDocument()
    // 'Set up' is also the rail phase heading, so read the chip beside the step count.
    expect(screen.getByText('Step 1 of 12').parentElement).toHaveTextContent('Set up')
  })

  it('keeps the Scenario when the Teacher walks away from the screen', () => {
    atStep(1)
    settle()

    fireEvent.click(screen.getByRole('button', { name: /Search and Rescue/i }))

    expect(readMission(null)?.scenarioId).toBe('search-rescue')
  })

  /*
   * The forward control was labelled with the next step's whole nextAction sentence, so
   * the button a Teacher presses twelve times a day changed width and wrapping every time.
   */
  it('moves on with a button that says Next, not a sentence', () => {
    atStep(2)
    settle()

    expect(screen.getByRole('link', { name: 'Next' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back' })).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Put each team on a craft/i }),
    ).not.toBeInTheDocument()
  })

  it('shows the area editor at step 2 and nothing else', () => {
    atStep(2)
    settle()

    expect(screen.getByRole('region', { name: 'Mission area' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Mission Scenario' })).not.toBeInTheDocument()
  })

  it('offers teams at step 3', () => {
    createTeam('Red Team')
    atStep(3)
    settle()

    expect(screen.getByRole('region', { name: 'Mission teams' })).toBeInTheDocument()
  })

  /*
   * The bug this redesign fixes outright. Pre-flight used to run on `drones[0]` alone, so
   * a Teacher ticked one craft and the other five were never asked about.
   */
  it('runs pre-flight for every craft a team has taken, not just the first', () => {
    createTeam('Red Team')
    createTeam('Blue Team')
    const [red, blue] = readTeams()
    assignDroneToTeam(red!.id, 'ttf-0001')
    assignDroneToTeam(blue!.id, 'ttf-0002')

    atStep(4)
    settle()

    expect(screen.getAllByText(/Propellers is the only one you tick/i)).toHaveLength(2)
  })

  it('says so plainly when step 4 has no craft to check', () => {
    atStep(4)
    settle()

    expect(screen.getByText(/No craft on a team yet/i)).toBeInTheDocument()
  })

  it('brings the briefing and the team briefs together at step 5', () => {
    createTeam('Red Team')
    const teamId = readTeams()[0]!.id
    assignDroneToTeam(teamId, 'ttf-0001')

    const first = atStep(1)
    settle()
    fireEvent.click(screen.getByRole('button', { name: /Search and Rescue/i }))
    first.unmount()

    atStep(5)
    settle()

    expect(
      screen.getByRole('region', { name: 'Mission rules and safety briefing' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Team briefs to print' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Team brief: Red Team/i)).toBeInTheDocument()
  })

  it('offers a way back as well as a way on', () => {
    atStep(3)
    settle()

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/lesson?step=2',
    )
  })

  it('keeps the Ready wall pre-flight summary, which is a different question', () => {
    atStep(1)
    settle()

    expect(screen.getByRole('heading', { name: 'Pre-flight check' })).toBeInTheDocument()
    expect(screen.queryByText(/Propellers is the only one you tick/i)).not.toBeInTheDocument()
  })
})

describe('the rail beside the set-up', () => {
  it('is there, with the twelve steps', () => {
    atStep(1)
    settle()

    expect(screen.getByRole('navigation', { name: /Mission steps/i })).toBeInTheDocument()
  })

  it('says why a later step is not open yet', () => {
    atStep(1)
    settle()

    expect(
      screen.getByTitle(/3\. Teams and Drones · Draw the Mission Zone first/i),
    ).toBeInTheDocument()
  })
})
