import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import {
  assignSeatCraft,
  grantSeatClearance,
  holdSeatClearance,
  openClassroom,
  readClassroomSession,
  requestTakeoff,
  resetClassroomForTests,
  updateSeatPhase,
  writeClassroomSession,
} from '@/lib/classroom-session'
import type { MissionOutcome } from '@/lib/mission'
import { clearLogbook, saveRoll } from '@/lib/logbook'
import { FleetProvider } from './FleetProvider'
import { StudentMissionScreen, WhatToDoNow } from './StudentMissionScreen'
import { playbookFor } from '@/lib/incident-playbook'

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

  /*
   * Poster step 4, and the reason a figure is never invented: a frozen screen and a working
   * screen look identical, so the age of the last reading is what says which this is.
   */
  it('says whether the board and the craft are actually there', () => {
    seatPriya()

    expect(screen.getByText(/^The Teacher's board$/)).toBeInTheDocument()
    expect(screen.getByText(/Joined\. Last heard/)).toBeInTheDocument()
  })

  it('shows no figure for a craft that is not reporting', () => {
    seatPriya()
    const session = readClassroomSession()!
    const seat = session.seats[0]!
    // A craft the Fleet has never heard of. The screen must say so and print nothing.
    assignSeatCraft(session, seat.studentId, 'ttf-9999', 'Drone 9')

    cleanup()
    studentScreen()
    settle()

    expect(screen.getByText(/Not reporting\. Tell your Teacher\./)).toBeInTheDocument()
    expect(screen.queryByText(/% charge/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Signal (weak|strong)/)).not.toBeInTheDocument()
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
    // Named twice on purpose: once on the identity line, once as the craft that is reporting.
    expect(screen.getAllByText('Drone 1')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Ask to take off' })).toBeInTheDocument()
  })
})

/*
 * What a Student is doing between asking and being told: standing at the flight line
 * looking at a tablet. The answer is the biggest thing on the screen for exactly as long
 * as that lasts.
 */
describe('asking for takeoff, and the answer', () => {
  const seatWithCraft = () => {
    saveRoll(['Priya'])
    classroomWithBrief()
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()
    const session = readClassroomSession()!
    const seat = session.seats[0]!
    assignSeatCraft(session, seat.studentId, 'ttf-0001', 'Drone 1')
    cleanup()
    studentScreen()
    settle()
    return seat.studentId
  }

  const reopen = () => {
    cleanup()
    studentScreen()
    settle()
  }

  it('records the ask and waits, without pretending to be cleared', () => {
    seatWithCraft()

    fireEvent.click(screen.getByRole('button', { name: 'Ask to take off' }))
    settle()

    expect(readClassroomSession()?.seats[0]?.phase).toBe('awaiting-clearance')
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for your Teacher')
    expect(screen.queryByRole('button', { name: 'Ask to take off' })).not.toBeInTheDocument()
  })

  it('says cleared once the Teacher grants it', () => {
    const studentId = seatWithCraft()
    fireEvent.click(screen.getByRole('button', { name: 'Ask to take off' }))
    settle()

    grantSeatClearance(readClassroomSession()!, studentId)
    reopen()

    expect(screen.getByRole('status')).toHaveTextContent('Cleared for takeoff')
  })

  /*
   * Held is an instruction, never a refusal. A child who reads "denied" has been told they
   * did something wrong; a child who reads "wait" has been told what happens next.
   */
  it('words a hold as an instruction, and lets them ask again', () => {
    const studentId = seatWithCraft()
    fireEvent.click(screen.getByRole('button', { name: 'Ask to take off' }))
    settle()

    holdSeatClearance(readClassroomSession()!, studentId)
    reopen()

    const said = screen.getByRole('status').textContent ?? ''
    expect(said).toContain('Hold for now')
    expect(said).not.toMatch(/denied|refused|rejected/i)
    expect(screen.getByRole('button', { name: 'Ask to take off' })).toBeInTheDocument()
  })

  it('keeps exactly one thing to press at every step of asking', () => {
    seatWithCraft()
    expect(screen.getAllByRole('button')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Ask to take off' }))
    settle()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  /*
   * A clearance is permission to leave the ground, not evidence of having left it. This is
   * the whole reason the screen reads `flownAt` and not `clearedAt`: a Student cleared and
   * still standing on the pad was being told they had landed.
   */
  it('leaves a cleared Student on the brief until the craft actually leaves the ground', () => {
    const studentId = seatWithCraft()
    fireEvent.click(screen.getByRole('button', { name: 'Ask to take off' }))
    settle()

    grantSeatClearance(readClassroomSession()!, studentId)
    reopen()

    expect(screen.getByRole('status')).toHaveTextContent('Cleared for takeoff')
    expect(screen.queryByText('You are down')).not.toBeInTheDocument()
  })

  /*
   * And once it has flown, the way back is its own screen. Nothing a Student presses puts
   * them here: `flownAt` is written from Telemetry, and the craft being on the ground is
   * read from Telemetry too.
   */
  it('shows the way down once the craft has flown and is down again', () => {
    const studentId = seatWithCraft()
    updateSeatPhase(readClassroomSession()!, studentId, 'returning', { flownAt: 5_000 })
    reopen()

    expect(screen.getByText('You are down')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ask to take off' })).not.toBeInTheDocument()
  })
})

/**
 * The score, once the Teacher has sealed it.
 *
 * Two things are worth pinning and nothing else is: that the number is the Teacher's own
 * rather than one this screen worked out again, and that the criteria shown are the ones
 * the Scenario said it would judge. Search and Rescue does not judge procedures, and a red
 * mark against work the brief never asked for is the failure mode here.
 */
describe('the score after landing', () => {
  const landedStudent = (outcome: MissionOutcome | null) => {
    saveRoll(['Priya'])
    classroomWithBrief()
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()
    const seated = readClassroomSession()!
    const studentId = seated.seats[0]!.studentId
    assignSeatCraft(seated, studentId, 'ttf-0001', 'Drone 1')
    updateSeatPhase(readClassroomSession()!, studentId, 'returning', { flownAt: 5_000 })
    if (outcome !== null) {
      writeClassroomSession({ ...readClassroomSession()!, outcome })
    }
    cleanup()
    studentScreen()
    settle()
  }

  const sealed = (score: number | null): MissionOutcome => ({
    endedAt: 9_000,
    criteria: {
      'tasks-completed': true,
      'safe-route': null,
      'no-collisions': true,
      'no-no-fly-violations': false,
      'procedures-followed': true,
    },
    failures: [],
    score,
    debrief: 'No no-fly violations not met.',
  })

  it('says nothing about a score until the Teacher has sealed one', () => {
    landedStudent(null)

    expect(screen.getByText('You are down')).toBeInTheDocument()
    expect(screen.queryByText('Your score')).not.toBeInTheDocument()
  })

  it("reads back the Teacher's sealed number rather than working one out again", () => {
    landedStudent(sealed(0.75))

    expect(screen.getByText('Your score')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('No no-fly violations not met.')).toBeInTheDocument()
  })

  /*
   * Search and Rescue judges four of the five. Procedures is not one of them, and showing
   * it would grade a child on something the brief never mentioned.
   */
  it('shows the criteria the Scenario judges, and no others', () => {
    landedStudent(sealed(0.75))

    expect(screen.getByLabelText('Required tasks completed: Met')).toBeInTheDocument()
    expect(screen.getByLabelText('Safe route followed: Not measured')).toBeInTheDocument()
    expect(screen.getByLabelText('No no-fly violations: Not met')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Correct procedures followed/)).not.toBeInTheDocument()
  })

  /*
   * Too little measured is a real answer and never a nought. Printing 0% for a Mission the
   * board could not judge is the invented reading this screen exists to refuse.
   */
  it('says a Mission it could not judge was not scored, rather than printing nought', () => {
    landedStudent(sealed(null))

    expect(screen.getByText('Not scored')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })
})

/**
 * The customer's "What if something happens" table.
 *
 * It already exists in this repository as data, so the only thing worth pinning is that the
 * screen reads it rather than repeating it. A row typed out here would drift from the
 * Teacher's console the first time somebody reworded one, and the two of them disagreeing
 * about what to do in an emergency is the failure this guards.
 */
describe('what to do when something happens', () => {
  it('takes its words from the playbook rather than restating them', () => {
    const lowBattery = playbookFor('battery-low')
    expect(lowBattery, 'the playbook has no battery-low entry').not.toBeNull()

    const rendered = WhatToDoNow({
      alerts: [
        {
          kind: 'battery-low',
          severity: 'warning',
          text: 'Charge is low.',
          since: 0,
        },
      ],
    })

    const shown = JSON.stringify(rendered)
    expect(shown).toContain(lowBattery!.teamDoes)
    expect(shown).toContain(lowBattery!.title)
  })

  it('says nothing at all while nothing is wrong', () => {
    expect(WhatToDoNow({ alerts: [] })).toBeNull()
  })
})
