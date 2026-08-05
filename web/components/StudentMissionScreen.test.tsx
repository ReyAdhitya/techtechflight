import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import {
  assignSeatCraft,
  openClassroom,
  readClassroomSession,
  resetClassroomForTests,
} from '@/lib/classroom-session'
import { clearLogbook, saveRoll } from '@/lib/logbook'
import { FleetProvider } from './FleetProvider'
import { StudentMissionScreen } from './StudentMissionScreen'

/**
 * The Student's screen, on a tablet.
 *
 * jsdom has no layout engine, so nothing here proves the screen looks right; the size and
 * the reading order are checked by looking at a screenshot. What these pin is what the
 * screen says, and what it refuses to say when the Fleet is not reporting.
 */

// FleetProvider reads the pathname to decide whether the Fleet is simulated.
vi.mock('next/navigation', () => ({
  usePathname: () => '/demo',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

const studentScreen = () =>
  render(
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>
      <StudentMissionScreen />
    </FleetProvider>,
  )

function classroomWithBrief() {
  const session = openClassroom({
    lessonId: 'L-0001',
    lessonLabel: 'Year 8',
    scenarioId: 'search-rescue',
    scenarioName: 'Search and Rescue',
    objective: 'Find the missing hiker and hover over them.',
    rules: ['Stay inside the Mission Zone.', 'Land when the Teacher says land.'],
    limitMinutes: 12,
    zones: [],
  })
  return session
}

beforeEach(() => {
  vi.useFakeTimers()
  clearLogbook()
  resetClassroomForTests()
})

afterEach(() => {
  vi.useRealTimers()
  clearLogbook()
  resetClassroomForTests()
})

describe('before a Teacher has opened the classroom', () => {
  it('says so, rather than showing an empty screen', () => {
    studentScreen()
    settle()

    expect(screen.getByText(/Waiting for the Teacher to open the classroom/i)).toBeInTheDocument()
  })
})

describe('taking a seat', () => {
  /*
   * No typing and no classroom code. A child at a shared tablet knows their own name and
   * nothing else, and a four-character code is a step that exists for the software.
   */
  it('offers the class roll, and nothing to type', () => {
    saveRoll(['Priya', 'Sam'])
    classroomWithBrief()

    studentScreen()
    settle()

    expect(screen.getByRole('button', { name: 'Priya' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sam' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('says so plainly when there is no class list yet', () => {
    classroomWithBrief()

    studentScreen()
    settle()

    expect(screen.getByText(/class list is empty/i)).toBeInTheDocument()
  })

  it('seats the Student who picked their name', () => {
    saveRoll(['Priya', 'Sam'])
    classroomWithBrief()

    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()

    expect(readClassroomSession()?.seats.map((seat) => seat.name)).toEqual(['Priya'])
  })
})

describe('the brief', () => {
  const seatPriya = () => {
    saveRoll(['Priya'])
    classroomWithBrief()
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()
  }

  /*
   * The objective is the h1 and the largest type on the screen. The rejected screen put it
   * in a chip beside a number, with text-heading as the biggest thing on a tablet read from
   * two metres.
   */
  it('leads with the objective', () => {
    seatPriya()

    const objective = screen.getByRole('heading', { level: 1 })
    expect(objective).toHaveTextContent('Find the missing hiker and hover over them.')
    expect(objective.className).toContain('text-summary')
  })

  it('says the time limit, the checkpoints and the rules, quietly', () => {
    seatPriya()

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText(/checkpoints/)).toBeInTheDocument()
    expect(screen.getByText('Stay inside the Mission Zone.')).toBeInTheDocument()
  })

  it('says the Teacher has not given them a craft yet, rather than inventing one', () => {
    seatPriya()

    expect(screen.getByText(/has not given you a craft yet/i)).toBeInTheDocument()
    // No craft means no pre-flight to show, and nothing to ask for.
    expect(screen.queryByRole('heading', { name: 'Before you fly' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ask to take off' })).not.toBeInTheDocument()
  })

  /*
   * The Teacher assigns the craft on their own board, in their own tab. Same-tab writes do
   * not come back through BroadcastChannel by spec, so this opens the tablet again rather
   * than pretending the write arrived live; the live path across two tabs is its own test.
   */
  it('shows the seven items for their own craft once they have one', () => {
    seatPriya()
    const session = readClassroomSession()!
    const seat = session.seats[0]!
    assignSeatCraft(session, seat.studentId, 'ttf-0001', 'Drone 1')

    cleanup()
    studentScreen()
    settle()

    expect(screen.getByRole('heading', { name: 'Before you fly' })).toBeInTheDocument()
    expect(screen.getByText('Drone 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ask to take off' })).toBeInTheDocument()
  })
})
