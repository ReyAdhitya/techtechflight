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
  readStudentSeatLocal,
  requestTakeoff,
  resetClassroomForTests,
  CLASSROOM_SESSION_KEY,
  STUDENT_SEAT_KEY,
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

/**
 * Say who is at this tablet.
 *
 * Typed, because the list under the box is the room rather than a roll to pick from: it names
 * the children already here and none of them is tappable, for the same reason a Drone somebody
 * has is not (#item 3). A child's own name typed on their own tablet cannot be somebody
 * else's, which was always the argument for the box.
 */
const sayIAm = (name: string) => {
  fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: name } })
  fireEvent.click(screen.getByRole('button', { name: 'That is me' }))
}

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

  /*
   * The list under the box is **this classroom**, not this device's history.
   *
   * It used to be the Logbook roll, which is kept on purpose so a Teacher types the class once
   * rather than every period — and which therefore only ever grows. One tablet offered five
   * names from five different lessons, and a child scanning them for their own was choosing
   * from a list of strangers.
   */
  it('says nothing about the room before anybody has joined it', () => {
    classroomWithBrief(['Priya', 'Sam'])

    studentScreen()
    settle()

    expect(screen.queryByRole('region', { name: 'Already in this classroom' })).not
      .toBeInTheDocument()
    expect(screen.queryByText('Sam')).not.toBeInTheDocument()
  })

  it('seats the Student who says their name', () => {
    classroomWithBrief(['Priya', 'Sam'])

    studentScreen()
    settle()
    sayIAm('Priya')
    settle()

    expect(readClassroomSession()?.seats.map((seat) => seat.name)).toEqual(['Priya'])
  })

  /*
   * A name somebody else has stays on screen and says why, exactly as a taken Drone does. It
   * used to be filtered out, so a child hunting for their own name found nothing and could not
   * tell "not offered" from "already used".
   */
  it('shows a name another child has taken, and does not offer it', () => {
    const opened = classroomWithBrief(['Priya', 'Sam'])
    const joined = joinClassroomAsStudent(opened, 'Sam', 1_000, 'stu-sam').session
    writeClassroomSession(takeDroneSeat(joined, 'stu-sam', 'ttf-0002'))
    window.localStorage.removeItem(STUDENT_SEAT_KEY)

    studentScreen()
    settle()

    const room = screen.getByRole('region', { name: 'Already in this classroom' })
    expect(within(room).getByText('Sam')).toBeInTheDocument()
    expect(within(room).getByText('Has Drone 2')).toBeInTheDocument()
    expect(within(room).queryByRole('button')).not.toBeInTheDocument()
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
    sayIAm('Priya')
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
    sayIAm('Priya')
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
    sayIAm('Priya')
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
    sayIAm('Priya')
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
    /*
     * No Mission press: nothing here asks the Teacher for anything, because the Teacher is
     * not listening. What is on it is the way out, and it is the fix for the trap this screen
     * used to be. Two of them now — leaving and changing rooms are different intentions, and
     * the only route to the code screen used to be the one that forgets the name.
     */
    const pressable = within(stage()).queryAllByRole('button')
    expect(pressable.map((button) => button.textContent)).toEqual([
      'Change classroom',
      'Leave this classroom',
    ])
  })

  it('says nothing while the board is answering', () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    sayIAm('Priya')
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
    sayIAm('Priya')
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
    sayIAm('Priya')
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
    sayIAm('Priya')
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
     *
     * Counted on the **stage**, which is where a Mission press lives. The rail's look-back
     * taps (ADR-0031) are not Mission presses for the same reason leaving is not: they ask
     * the Teacher for nothing, write no record and reach no aircraft. `StudentStepRail.test`
     * holds the other half, that no row ahead of a child is pressable at all.
     */
    const missionPresses = () =>
      within(stage())
        .queryAllByRole('button')
        .filter(
          (button) => !/(leave|change) (this )?classroom/i.test(button.textContent ?? ''),
        )

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
    sayIAm('Priya')
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
/**
 * Silence is not flight.
 *
 * The way out was gated on `!airborne` alone, and a tablet that last heard "airborne"
 * seventeen hours ago still believes it: a child sat on "Land and wait" with nothing to press,
 * for as long as the tablet stayed open, in a room where the lesson had finished the previous
 * afternoon. The heartbeat already knows the difference.
 */
describe('the way out when the board has gone quiet', () => {
  const seatOnDroneOne = () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    sayIAm('Priya')
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Drone 1' }))
    settle()
  }

  const withBoardSilentFor = (ms: number) => {
    writeClassroomSession({ ...readClassroomSession()!, boardSeenAt: Date.now() - ms })
    cleanup()
    studentScreen()
    settle()
  }

  it('offers the way out on the lost-board screen', () => {
    seatOnDroneOne()
    withBoardSilentFor(QUIET_AFTER_MS + 60_000)

    expect(screen.getByRole('status')).toHaveTextContent('Land and wait')
    expect(screen.getByRole('button', { name: 'Leave this classroom' })).toBeInTheDocument()
  })

  /* The board is answering, so the screen is true and there is nothing to escape from. */
  it('says nothing about leaving while the board is answering', () => {
    seatOnDroneOne()
    withBoardSilentFor(1_000)

    expect(screen.queryByText('Land and wait')).not.toBeInTheDocument()
  })
})

describe('leaving the classroom', () => {
  const joinAsPriya = () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    sayIAm('Priya')
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
    sayIAm('Priya')
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
    sayIAm('Priya')
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Drone 1' }))
    settle()

    // On the ground, the way out is there.
    expect(screen.getByRole('button', { name: 'Leave this classroom' })).toBeInTheDocument()
  })
})

/**
 * Looking back at a step already done (ADR-0031).
 *
 * The two conditions the ADR rests on are both here, and neither is decoration: a way back to
 * now for when nothing else happens, and the screen pulling itself back the moment the lesson
 * moves. The second is the one that matters. A child re-reading the rules must not miss their
 * takeoff clearance, and the Teacher's answer outranks whatever the child chose to look at.
 */
describe('looking back at a step already done', () => {
  const rail = () => document.querySelector('aside')!

  const asked = () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    sayIAm('Priya')
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Drone 1' }))
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Ask to take off' }))
    settle()
    return readClassroomSession()!.seats[0]!.studentId
  }

  const lookBackAt = (label: RegExp) => {
    fireEvent.click(within(rail()).getByRole('button', { name: label }))
    settle()
  }

  /*
   * The Teacher answers from their own board, which is another tab. One jsdom is one window,
   * so the storage event that tab would raise is raised by hand; the browser walk proves the
   * real thing across two real tabs.
   */
  const teacherAnswers = (studentId: string) => {
    act(() => {
      grantSeatClearance(readClassroomSession()!, studentId)
      window.dispatchEvent(new StorageEvent('storage', { key: CLASSROOM_SESSION_KEY }))
    })
    settle()
  }

  it('re-reads the rules a child was given, without asking the Teacher', () => {
    asked()
    lookBackAt(/Rules and time/)

    expect(within(stage()).getByText('Looking back at step 2')).toBeInTheDocument()
    expect(within(stage()).getByText('Land when the Teacher says land.')).toBeInTheDocument()
  })

  it('reads what the class was asked to do when they tap the briefing', () => {
    asked()
    lookBackAt(/Briefing/)

    expect(
      within(stage()).getByText('Find the missing hiker and hover over them.'),
    ).toBeInTheDocument()
  })

  /* Reading is memory, not a choice: there is nothing on the stage to press while it is up. */
  it('offers no Mission press while a child is reading', () => {
    asked()
    lookBackAt(/Rules and time/)

    expect(
      within(stage())
        .queryAllByRole('button')
        .filter((button) => !/leave this classroom/i.test(button.textContent ?? '')),
    ).toHaveLength(0)
  })

  it('comes back to now when the child asks it to', () => {
    asked()
    lookBackAt(/Rules and time/)

    fireEvent.click(screen.getByRole('button', { name: 'Back to now' }))
    settle()

    expect(within(stage()).queryByText('Looking back at step 2')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Waiting for your Teacher')
  })

  /*
   * The half that cannot be left to a child. A clearance arrives while step 2 is on the
   * screen, and the screen is the Teacher's answer again without anybody pressing anything.
   */
  it('pulls itself back the moment the Teacher answers', () => {
    const studentId = asked()
    lookBackAt(/Rules and time/)
    expect(within(stage()).getByText('Looking back at step 2')).toBeInTheDocument()

    teacherAnswers(studentId)

    expect(within(stage()).queryByText('Looking back at step 2')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Cleared for takeoff')
  })

  /* And a step the lesson has not reached is not on offer in the first place. */
  it('never offers a step still to come', () => {
    asked()

    expect(within(rail()).queryByRole('button', { name: /Score/ })).not.toBeInTheDocument()
    expect(within(rail()).queryByRole('button', { name: /Land/ })).not.toBeInTheDocument()
  })
})

/**
 * Changing classroom, which is not leaving.
 *
 * The only route to the code screen was Leave, and Leave forgets the name as well as the room
 * and reads as final. A Teacher moving a tablet to the other class landed back on *What is
 * your name?* with nothing to do but type it again — same tablet, same child, same morning.
 * Two intentions, two buttons, and only one of them is destructive.
 */
describe('changing classroom, which is not leaving', () => {
  const seatedPriya = () => {
    classroomWithBrief(['Priya'])
    studentScreen()
    settle()
    sayIAm('Priya')
    settle()
    fireEvent.click(screen.getByRole('button', { name: 'Drone 1' }))
    settle()
  }

  it('goes to the code screen and keeps whose tablet it is', () => {
    seatedPriya()

    fireEvent.click(screen.getByRole('button', { name: 'Change classroom' }))
    settle()

    expect(screen.getByRole('heading', { name: 'Which classroom?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Classroom code')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent("Still Priya's tablet")
    /* The name is the thing that had to survive, and it lives in this key. */
    expect(readStudentSeatLocal()?.name).toBe('Priya')
  })

  /* And it does not walk straight back into the room it just left, on one laptop. */
  it('stays at the code screen with the old classroom still in this browser', () => {
    seatedPriya()

    fireEvent.click(screen.getByRole('button', { name: 'Change classroom' }))
    settle()
    settle()

    expect(screen.getByRole('heading', { name: 'Which classroom?' })).toBeInTheDocument()
  })

  it('re-seats the same child in the new classroom without asking their name again', () => {
    seatedPriya()
    fireEvent.click(screen.getByRole('button', { name: 'Change classroom' }))
    settle()

    /* The other room opens on this machine, the way a second tab of the board would. */
    act(() => {
      writeClassroomSession(
        openClassroom({
          lessonId: 'L-0002',
          lessonLabel: 'Year 9',
          scenarioId: 'search-rescue',
          scenarioName: 'Search and Rescue',
          objective: 'Find the missing hiker.',
          rules: [],
          limitMinutes: 12,
          zones: [],
          drones: THREE_DRONES,
        }),
      )
      window.dispatchEvent(new StorageEvent('storage', { key: CLASSROOM_SESSION_KEY }))
    })
    settle()

    expect(screen.queryByRole('heading', { name: 'What is your name?' })).not.toBeInTheDocument()
    expect(readClassroomSession()?.seats.map((seat) => seat.name)).toEqual(['Priya'])
  })

  /* Leave still forgets everything. That was never the broken half. */
  it('leaves the name behind when a child actually leaves', () => {
    seatedPriya()

    fireEvent.click(screen.getByRole('button', { name: 'Leave this classroom' }))
    settle()

    expect(screen.getByRole('status')).toHaveTextContent('You left the classroom')
    expect(readStudentSeatLocal()).toBeNull()
  })
})
