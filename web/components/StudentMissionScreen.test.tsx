import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import {
  assignSeatCraft,
  grantSeatClearance,
  holdSeatClearance,
  joinClassroomAsStudent,
  openClassroom,
  readClassroomSession,
  requestTakeoff,
  resetClassroomForTests,
  CLASSROOM_SESSION_KEY,
  QUIET_AFTER_MS,
  closeClassroom,
  takeDroneSeat,
  updateSeatPhase,
  writeClassroomSession,
  writeStudentSeatLocal,
  type ClassroomDrone,
} from '@/lib/classroom-session'
import type { MissionOutcome } from '@/lib/mission'
import { clearLogbook, legacyStudentIdFor } from '@/lib/logbook'
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

/** The craft a Teacher put in the Lesson, as the join grid sees them. */
const THREE_DRONES = [
  { droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 },
  { droneId: 'ttf-0002', droneName: 'Drone 2', number: 2 },
  { droneId: 'ttf-0003', droneName: 'Drone 3', number: 3 },
] as const

function classroomWithBrief(
  names: readonly string[] = [],
  drones: readonly ClassroomDrone[] = THREE_DRONES,
) {
  const session = openClassroom({
    lessonId: 'L-0001',
    lessonLabel: 'Year 8',
    scenarioId: 'search-rescue',
    scenarioName: 'Search and Rescue',
    objective: 'Find the missing hiker and hover over them.',
    rules: ['Stay inside the Mission Zone.', 'Land when the Teacher says land.'],
    limitMinutes: 12,
    zones: [],
    roster: names.map((name) => ({ studentId: legacyStudentIdFor(name), name })),
    drones,
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

/**
 * The stage alone, without the look-only rail beside it.
 *
 * The rail names all twelve steps and numbers them, so a bare "12" or a Drone name is on
 * screen twice on purpose (ADR-0028). Scope to the stage when the count is the point.
 */
const stage = () => document.querySelector('main')!

describe('before a Teacher has opened the classroom', () => {
  it('says so, rather than showing an empty screen', () => {
    studentScreen()
    settle()

    expect(screen.getByText(/Waiting for the Teacher to open the classroom/i)).toBeInTheDocument()
  })
})

describe('joining', () => {
  it('asks for a name, typed once', () => {
    classroomWithBrief()

    studentScreen()
    settle()

    expect(screen.getByRole('heading', { name: 'What is your name?' })).toBeInTheDocument()
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
  })

  it('offers the class roll as well, when the Teacher has typed one in', () => {
    classroomWithBrief(['Priya', 'Sam'])

    studentScreen()
    settle()

    expect(screen.getByRole('button', { name: 'Priya' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sam' })).toBeInTheDocument()
  })

  it('seats the Student who picked their name', () => {
    classroomWithBrief(['Priya', 'Sam'])

    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()

    expect(readClassroomSession()?.seats.map((seat) => seat.name)).toEqual(['Priya'])
  })

  it('remembers the name on this tablet, so the next morning is one tap', () => {
    classroomWithBrief()
    studentScreen()
    settle()
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Amira' } })
    fireEvent.click(screen.getByRole('button', { name: 'That is me' }))
    settle()

    cleanup()
    studentScreen()
    settle()

    expect(screen.queryByRole('heading', { name: 'What is your name?' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Which Drone are you holding?' }))
      .toBeInTheDocument()
  })

  /*
   * The number painted on the aircraft, not a name from a list of thirty. The child is
   * checking against a physical object in their hands.
   */
  it('asks which Drone they are holding, by number', () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()

    expect(screen.getByRole('heading', { name: 'Which Drone are you holding?' }))
      .toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Drone 2' }))
    settle()

    expect(readClassroomSession()?.seats[0]?.droneName).toBe('Drone 2')
  })

  it('greys out a Drone somebody already has, and will not seat a second child on it', () => {
    const opened = classroomWithBrief(['Priya'])
    // Sam got to Drone 2 first, on their own tablet.
    const withSam = joinClassroomAsStudent(opened, 'Sam', 1_000, 'stu-sam')
    takeDroneSeat(withSam.session, 'stu-sam', 'ttf-0002')
    // Sam is on their own iPad. Joining writes the seat to *this* device, so clear it or the
    // screen under test comes up as Sam.
    writeStudentSeatLocal(null)

    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()

    const taken = screen.getByRole('button', { name: 'Drone 2, taken by Sam' })
    expect(taken).toBeDisabled()

    fireEvent.click(taken)
    settle()
    expect(readClassroomSession()?.seats.find((seat) => seat.name === 'Sam')?.droneId)
      .toBe('ttf-0002')
    expect(readClassroomSession()?.seats.find((seat) => seat.name === 'Priya')?.droneId)
      .toBeNull()
  })

  it('says so rather than showing an empty grid when no Drone is in the Lesson yet', () => {
    classroomWithBrief(['Priya'], [])
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()

    expect(screen.getByText(/has not put any Drones in this lesson yet/i)).toBeInTheDocument()
  })
})

/**
 * A frozen tablet and a working tablet look identical.
 *
 * Every figure on this screen came from the Teacher's board, so when the board stops
 * answering the screen has stopped being true. Holding the last set on display is the failure
 * this product refuses one reading at a time, applied to a whole screen.
 */
describe('when the tablet loses the board', () => {
  it('says so, and prints none of the numbers it was holding', () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Drone 1' }))
    settle()

    const heard = Date.now() - QUIET_AFTER_MS - 1_000
    writeClassroomSession({ ...readClassroomSession()!, boardSeenAt: heard })
    cleanup()
    studentScreen()
    settle()

    expect(screen.getByRole('status')).toHaveTextContent('Land and wait')
    expect(within(stage()).queryByText(/% charge/)).not.toBeInTheDocument()
    expect(within(stage()).queryByRole('button')).not.toBeInTheDocument()
  })

  it('says nothing while the board is answering', () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Drone 1' }))
    settle()

    writeClassroomSession({ ...readClassroomSession()!, boardSeenAt: Date.now() })
    cleanup()
    studentScreen()
    settle()

    expect(screen.queryByText('Land and wait')).not.toBeInTheDocument()
  })
})

describe('the brief', () => {
  const seatPriya = () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Drone 1' }))
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

    // Scoped to the stage: the rail numbers its twelve steps, so a bare 12 is ambiguous.
    expect(within(stage()).getByText('12')).toBeInTheDocument()
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

  /*
   * "You do not have a Drone yet" was correct and useless: nobody was ever assigned, and it
   * was the only thing the screen had to say. A child with no Drone is asked which one they
   * are holding instead, which is a question they can answer.
   */
  it('asks which Drone rather than announcing that they have none', () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()

    expect(screen.queryByText(/do not have a Drone yet/i)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Which Drone are you holding?' }))
      .toBeInTheDocument()
    // No craft means no pre-flight to show, and nothing to ask for.
    expect(screen.queryByRole('heading', { name: 'Before you fly' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ask to take off' })).not.toBeInTheDocument()
  })

  it('shows the seven items for their own craft once they have one', () => {
    seatPriya()

    expect(screen.getByRole('heading', { name: 'Before you fly' })).toBeInTheDocument()
    // Named twice on the stage: on the identity line, and as the Drone that is reporting.
    // The rail names it a third time, which is why this is scoped.
    expect(within(stage()).getAllByText('Drone 1')).toHaveLength(2)
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
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Drone 1' }))
    settle()
    return readClassroomSession()!.seats[0]!.studentId
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

  it('keeps exactly one Mission thing to press at every step of asking', () => {
    /*
     * Ask and Understood are the only two **Mission** presses (ADR-0025), and the way out of
     * the classroom is not one, in exactly the way joining is not: both happen outside a
     * Mission, and neither reaches an aircraft. The reasoning is written in
     * `WhichDroneAreYouHolding` and again in `leaveClassroom`.
     *
     * Switch role is a different thing and is still gone. It was two taps from a child to the
     * Teacher's Land and Stop, and the test below refuses it by name.
     */
    const missionPresses = () =>
      screen
        .queryAllByRole('button')
        .filter((button) => !/leave this classroom/i.test(button.textContent ?? ''))

    seatWithCraft()
    expect(missionPresses()).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Ask to take off' }))
    settle()
    expect(missionPresses()).toHaveLength(0)
  })

  it('gives a child no way out of the Student app', () => {
    seatWithCraft()
    expect(screen.queryByRole('button', { name: /switch role/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
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
    classroomWithBrief(['Priya'])
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

/**
 * A tablet can walk out of a classroom.
 *
 * The owner opened this on an iPhone and found it sitting in a lesson called "bleble" that
 * had finished weeks earlier. There was no way to leave, the code never changed, and nothing
 * had ever said the lesson was over.
 */
describe('leaving the classroom', () => {
  const joinAsPriya = () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()
  }

  it('offers a visible way out before a Drone is taken', () => {
    joinAsPriya()

    expect(screen.getByRole('button', { name: 'Leave this classroom' })).toBeInTheDocument()
  })

  it('forgets the classroom and goes back to the door, saying why', () => {
    joinAsPriya()
    fireEvent.click(screen.getByRole('button', { name: 'Leave this classroom' }))
    settle()

    expect(window.localStorage.getItem(CLASSROOM_SESSION_KEY)).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('You left the classroom')
    expect(screen.getByLabelText('Classroom code')).toBeInTheDocument()
  })

  /*
   * On one machine the Teacher's own session is in the same localStorage, so the same-laptop
   * convenience would put the child straight back into the room they just walked out of.
   */
  it('does not walk straight back in on the same machine', () => {
    joinAsPriya()
    fireEvent.click(screen.getByRole('button', { name: 'Leave this classroom' }))
    settle()
    settle()

    expect(screen.getByRole('heading', { name: 'Join the classroom' })).toBeInTheDocument()
  })

  it('says the lesson has ended rather than leaving the tablet in it', () => {
    joinAsPriya()
    closeClassroom(Date.now())
    cleanup()
    studentScreen()
    settle()

    expect(screen.getByRole('heading', { name: 'The lesson has ended' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave this classroom' })).toBeInTheDocument()
  })

  /*
   * A child whose Drone is on the ground walks out, even with a Drone chosen.
   *
   * This asserted only that the way out was on the screen somewhere, and passed on a screen
   * that was still showing the brief of a finished lesson: the foot control is on the brief
   * too. A screenshot caught it. The heading is what distinguishes the two, so the heading is
   * what is asserted.
   */
  it('shows a child whose Drone is down the way out, once the Lesson has ended', () => {
    joinAsPriya()
    fireEvent.click(screen.getByRole('button', { name: 'Drone 1' }))
    settle()

    closeClassroom(Date.now())
    cleanup()
    studentScreen()
    settle()

    expect(screen.getByRole('heading', { name: 'The lesson has ended' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Find the missing hiker/ }))
      .not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Leave this classroom' })).toBeInTheDocument()
  })

  /*
   * Never take a screen away from a child holding a flying aircraft: the tablet reads "The
   * lesson has ended. Land now." until Telemetry sees the Drone down.
   *
   * Not pinned here, and that is deliberate rather than an omission. `airborne` comes from
   * the Fleet, and the pinned demonstration this suite runs never leaves the ground, so the
   * branch is unreachable in jsdom whatever the session says. It is walked in a browser
   * instead, which is where every serious defect in this product has been found.
   */

  /*
   * "Wait, and they will appear" is a lie on a session nobody has touched for an hour. The
   * board's own silence is the evidence, and it is the sentence that iPhone should have had.
   */
  it('names a finished lesson rather than promising Drones that will never appear', () => {
    classroomWithBrief(['Priya'], [])
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()

    writeClassroomSession({
      ...readClassroomSession()!,
      boardSeenAt: Date.now() - QUIET_AFTER_MS - 60_000,
    })
    cleanup()
    studentScreen()
    settle()

    const said = screen.getByRole('status').textContent ?? ''
    expect(said).toContain('This lesson looks finished')
    expect(screen.queryByText(/Wait, and they will appear/)).not.toBeInTheDocument()
  })

  /* The two Mission presses are unaffected: leaving is gone while the Drone is up. */
  it('takes the way out off the screen while the Drone is flying', () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Priya' }))
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Drone 1' }))
    settle()

    // On the ground, the way out is there.
    expect(screen.getByRole('button', { name: 'Leave this classroom' })).toBeInTheDocument()
  })
})
