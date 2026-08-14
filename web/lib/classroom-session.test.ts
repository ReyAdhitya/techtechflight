import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  assignSeatCraft,
  boardQuietForMs,
  canTakeDrone,
  classroomHasEnded,
  closeClassroom,
  droneGrid,
  droneNumber,
  grantSeatClearance,
  grantSeatsForDrone,
  holdSeatClearance,
  holdSeatsForDrone,
  joinClassroomAsStudent,
  loadClassroomByCode,
  markSeatFlown,
  mintClassroomCode,
  normalizeClassroomCode,
  mergeClassroomSessions,
  openClassroom,
  readClassroomSession,
  requestTakeoff,
  resetClassroomForTests,
  freeDroneSeat,
  leaveClassroom,
  mayLeaveClassroom,
  roomAround,
  seatsWithoutADrone,
  QUIET_AFTER_MS,
  quietSeats,
  seatHasFlown,
  seatStudentByHand,
  STUDENT_SEAT_KEY,
  studentOnDrone,
  CLASSROOM_SESSION_KEY,
  takeDroneSeat,
  touchBoard,
  touchSeat,
  type ClassroomSeat,
  type ClassroomSession,
} from './classroom-session'

beforeEach(() => {
  resetClassroomForTests()
})

afterEach(() => {
  resetClassroomForTests()
})

describe('classroom session', () => {
  it('mints a short shoutable code', () => {
    const code = mintClassroomCode(1_700_000_000_000)
    expect(code).toHaveLength(4)
    expect(normalizeClassroomCode(' ab-12 ')).toBe('AB12')
  })

  it('opens a live classroom and lets a Student join and request takeoff', () => {
    const session = openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 8',
      scenarioId: 'search-rescue',
      scenarioName: 'Search and Rescue',
      objective: 'Find the target.',
      rules: ['Stay inside the zone'],
      limitMinutes: 15,
      zones: [],
      roster: [{ studentId: 'stu-ada', name: 'Ada' }],
      live: true,
      now: 1_000,
    })

    expect(session.code).toHaveLength(4)
    expect(session.live).toBe(true)
    expect(session.roster).toEqual([{ studentId: 'stu-ada', name: 'Ada' }])

    const joined = joinClassroomAsStudent(session, 'Ada', 2_000, 'stu-ada')
    expect(joined.seat.name).toBe('Ada')
    expect(joined.seat.studentId).toBe('stu-ada')
    expect(joined.session.seats).toHaveLength(1)

    const requested = requestTakeoff(joined.session, joined.seat.studentId, 3_000)
    expect(requested.seats[0]?.phase).toBe('awaiting-clearance')

    const granted = grantSeatClearance(requested, joined.seat.studentId, 4_000)
    expect(granted.seats[0]?.phase).toBe('cleared')
    expect(granted.seats[0]?.clearedAt).toBe(4_000)
  })

  it('loads a classroom by code from localStorage before asking the cloud', async () => {
    const session = openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 8',
      scenarioId: 'search-rescue',
      scenarioName: 'Search and Rescue',
      objective: 'Find the target.',
      rules: [],
      limitMinutes: 15,
      zones: [],
      live: true,
      now: 1_000,
    })

    const found = await loadClassroomByCode(session.code)
    expect(found?.code).toBe(session.code)
    expect(found?.lessonLabel).toBe('Year 8')
  })
})

/**
 * The phase is a record of what happened, and every writer here is either the Teacher
 * answering or the Fleet reporting. There is no press anywhere that says "I have landed".
 */
describe('the phase a Student is in', () => {
  const seatedAda = () => {
    const session = openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 8',
      scenarioId: 'search-rescue',
      scenarioName: 'Search and Rescue',
      objective: 'Find the target.',
      rules: [],
      limitMinutes: 15,
      zones: [],
      live: true,
      now: 1_000,
    })
    return joinClassroomAsStudent(session, 'Ada', 2_000)
  }

  /*
   * Held used to send the seat back to `request-takeoff`, which made a Student the Teacher
   * had told to wait indistinguishable from one who had never asked. The screen then had no
   * way to say why they were waiting.
   */
  it('keeps a hold apart from never having asked', () => {
    const { session, seat } = seatedAda()
    const asked = requestTakeoff(session, seat.studentId, 3_000)

    const held = holdSeatClearance(asked, seat.studentId, 4_000)
    expect(held.seats[0]?.phase).toBe('held')
    expect(held.seats[0]?.heldAt).toBe(4_000)
    expect(held.seats[0]?.takeoffRequestedAt).toBeNull()

    // Asking again is what clears it; the Teacher is not asked to un-hold.
    const askedAgain = requestTakeoff(held, seat.studentId, 5_000)
    expect(askedAgain.seats[0]?.phase).toBe('awaiting-clearance')
    expect(askedAgain.seats[0]?.heldAt).toBeNull()
  })

  /*
   * The other half of the Teacher's Hold. Without this the answer never leaves the Teacher's
   * board and the Student sits on "Waiting for your Teacher" while the Teacher believes they
   * have been told to wait.
   */
  it('carries a hold addressed to a craft to the seat sitting in it', () => {
    const { session, seat } = seatedAda()
    const paired = assignSeatCraft(session, seat.studentId, 'ttf-0001', 'Drone 1')
    const asked = requestTakeoff(paired, seat.studentId, 3_000)

    const held = holdSeatsForDrone(asked, 'ttf-0001', 4_000)
    expect(held.seats[0]?.phase).toBe('held')
    expect(held.seats[0]?.heldAt).toBe(4_000)
  })

  /* A Student who never asked is not answered. */
  it('holds nobody who has not asked to take off', () => {
    const { session, seat } = seatedAda()
    const paired = assignSeatCraft(session, seat.studentId, 'ttf-0001', 'Drone 1')

    const held = holdSeatsForDrone(paired, 'ttf-0001', 4_000)
    expect(held.seats[0]?.phase).not.toBe('held')
    expect(held.seats[0]?.heldAt).toBeNull()
  })

  /*
   * A clearance is permission to leave the ground, not evidence of having left it. Reading
   * one as the other put a Student still standing on the pad on the landed screen.
   */
  it('does not read a clearance as having flown', () => {
    const { session, seat } = seatedAda()
    const cleared = grantSeatClearance(session, seat.studentId, 4_000)

    expect(seatHasFlown(cleared.seats[0]!)).toBe(false)
  })

  it('records the first sighting off the ground and never a later one', () => {
    const { session, seat } = seatedAda()

    const flying = markSeatFlown(session, seat.studentId, 5_000)
    expect(flying.seats[0]?.phase).toBe('flying')
    expect(flying.seats[0]?.flownAt).toBe(5_000)

    const again = markSeatFlown(flying, seat.studentId, 9_000)
    expect(again.seats[0]?.flownAt).toBe(5_000)
  })

  /*
   * A session outlives a deploy: it sits in `localStorage` and is read back by whatever
   * ships next. A seat written before `flownAt` existed has no such field, and reading the
   * absence as "has flown" would land a Student who never took off.
   */
  it('treats a seat written before flownAt existed as never having flown', () => {
    const { seat } = seatedAda()
    const { flownAt: _absent, ...older } = seat

    expect(seatHasFlown(older as ClassroomSeat)).toBe(false)
  })
})

/**
 * Why the Teacher's board threads the session through its answers.
 *
 * Every one of these writers persists what it returns, so a single answer reaches the tablet
 * on its own. Each also *starts* from the session it is handed, which is the part that is easy
 * to miss: answering two Drones from the same stale session writes a session missing the first
 * answer. `ControlScreen` threads the return value between its grant and hold loops for that
 * reason, and the thread has been read as dead code once already.
 */
describe('answering two Drones in one press', () => {
  const twoSeated = () => {
    const session = openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 8',
      scenarioId: 'search-rescue',
      scenarioName: 'Search and Rescue',
      objective: 'Find the target.',
      rules: [],
      limitMinutes: 15,
      zones: [],
      live: true,
      now: 1_000,
    })
    const ada = joinClassroomAsStudent(session, 'Ada', 2_000, 'stu-ada')
    /*
     * Two tablets, not two names on one. A join reuses the seat this device already holds,
     * which is right on a tablet and wrong in a test that needs two children.
     */
    window.localStorage.removeItem(STUDENT_SEAT_KEY)
    const bea = joinClassroomAsStudent(ada.session, 'Bea', 2_100, 'stu-bea')
    let next = assignSeatCraft(bea.session, 'stu-ada', 'ttf-0001', 'Drone 1')
    next = assignSeatCraft(next, 'stu-bea', 'ttf-0002', 'Drone 2')
    next = requestTakeoff(next, 'stu-ada', 3_000)
    next = requestTakeoff(next, 'stu-bea', 3_100)
    return next
  }

  const phaseOf = (session: ClassroomSession, studentId: string) =>
    session.seats.find((seat) => seat.studentId === studentId)?.phase

  it('keeps both answers when the session is threaded', () => {
    const asked = twoSeated()

    let answered = grantSeatsForDrone(asked, 'ttf-0001', 4_000)
    answered = holdSeatsForDrone(answered, 'ttf-0002', 4_100)

    expect(phaseOf(answered, 'stu-ada')).toBe('cleared')
    expect(phaseOf(answered, 'stu-bea')).toBe('held')
    // And the same on the record the tablets actually read.
    expect(phaseOf(readClassroomSession()!, 'stu-ada')).toBe('cleared')
    expect(phaseOf(readClassroomSession()!, 'stu-bea')).toBe('held')
  })

  /* The failure the thread exists to prevent, pinned so nobody unpicks it again. */
  it('loses the first answer when the same stale session is passed twice', () => {
    const asked = twoSeated()

    grantSeatsForDrone(asked, 'ttf-0001', 4_000)
    holdSeatsForDrone(asked, 'ttf-0002', 4_100)

    expect(phaseOf(readClassroomSession()!, 'stu-bea')).toBe('held')
    expect(phaseOf(readClassroomSession()!, 'stu-ada')).not.toBe('cleared')
  })
})

/**
 * How a Student gets on a Drone: they tap the number painted on the one in their hands.
 *
 * The greying out on the tablet is a courtesy. These pin the refusal underneath it, because
 * two children reaching for Drone 3 tap in the same second and the screen they are looking at
 * was rendered before either of them moved.
 */
describe('taking the Drone in your hands', () => {
  const withThree = () =>
    openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 6',
      scenarioId: null,
      scenarioName: '',
      objective: '',
      rules: [],
      limitMinutes: 20,
      zones: [],
      drones: [
        { droneId: 'ttf-0003', droneName: 'Drone 3', number: 3 },
        { droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 },
      ],
    })

  it('reads the number off the name, then off the id', () => {
    expect(droneNumber('Drone 12', 'ttf-0012')).toBe(12)
    expect(droneNumber('Kestrel', 'ttf-0004')).toBe(4)
    // Neither carries one. Zero sorts it to the front rather than dropping it off the grid.
    expect(droneNumber('Kestrel', 'kestrel')).toBe(0)
  })

  it('offers the grid by number, not by id', () => {
    const session = withThree()
    expect(droneGrid(session).map((row) => row.number)).toEqual([1, 3])
    expect(droneGrid(session).every((row) => row.takenBy === null)).toBe(true)
  })

  it('seats a Student on the Drone they tapped', () => {
    const session = joinClassroomAsStudent(withThree(), 'Amira', 1_000, 'stu-amira').session
    const next = takeDroneSeat(session, 'stu-amira', 'ttf-0003')

    expect(next.seats[0]?.droneName).toBe('Drone 3')
    expect(droneGrid(next).find((row) => row.number === 3)?.takenBy).toBe('Amira')
  })

  it('refuses a Drone somebody else already has', () => {
    const first = joinClassroomAsStudent(withThree(), 'Amira', 1_000, 'stu-amira').session
    window.localStorage.removeItem(STUDENT_SEAT_KEY)
    const second = joinClassroomAsStudent(first, 'Ben', 1_100, 'stu-ben').session

    const held = takeDroneSeat(second, 'stu-amira', 'ttf-0003')
    const refused = takeDroneSeat(held, 'stu-ben', 'ttf-0003')

    expect(refused.seats.find((seat) => seat.studentId === 'stu-ben')?.droneId).toBeNull()
    expect(refused.seats.find((seat) => seat.studentId === 'stu-amira')?.droneId).toBe('ttf-0003')
  })

  it('lets a Student change their mind, because a child has one pair of hands', () => {
    const session = joinClassroomAsStudent(withThree(), 'Amira', 1_000, 'stu-amira').session
    const three = takeDroneSeat(session, 'stu-amira', 'ttf-0003')
    const one = takeDroneSeat(three, 'stu-amira', 'ttf-0001')

    expect(one.seats[0]?.droneName).toBe('Drone 1')
    expect(droneGrid(one).find((row) => row.number === 3)?.takenBy).toBeNull()
  })

  it('ignores a Drone that is not in this Lesson', () => {
    const session = joinClassroomAsStudent(withThree(), 'Amira', 1_000, 'stu-amira').session
    expect(takeDroneSeat(session, 'stu-amira', 'ttf-9999').seats[0]?.droneId).toBeNull()
  })
})

/**
 * The Teacher's half of the same question.
 *
 * A broken iPad must not stop a child flying, and a seat holding a craft nobody is flying is
 * what stops the next child taking it.
 */
describe('the Teacher seating and freeing by hand', () => {
  const withOne = () =>
    openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 6',
      scenarioId: null,
      scenarioName: '',
      objective: '',
      rules: [],
      limitMinutes: 20,
      zones: [],
      drones: [{ droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 }],
    })

  it('puts a child with no tablet on a Drone', () => {
    const next = seatStudentByHand(withOne(), 'ttf-0001', 'Amira', 5_000)

    expect(next.seats).toHaveLength(1)
    expect(next.seats[0]?.name).toBe('Amira')
    expect(next.seats[0]?.droneId).toBe('ttf-0001')
  })

  it('renames whoever took it, because the Teacher can see both children', () => {
    const joined = joinClassroomAsStudent(withOne(), 'Ben', 1_000, 'stu-ben').session
    const taken = takeDroneSeat(joined, 'stu-ben', 'ttf-0001')

    const next = seatStudentByHand(taken, 'ttf-0001', 'Amira', 5_000)

    expect(next.seats).toHaveLength(1)
    expect(next.seats[0]?.name).toBe('Amira')
  })

  it('ignores an empty name and a Drone that is not in the Lesson', () => {
    expect(seatStudentByHand(withOne(), 'ttf-0001', '   ', 5_000).seats).toHaveLength(0)
    expect(seatStudentByHand(withOne(), 'ttf-9999', 'Amira', 5_000).seats).toHaveLength(0)
  })

  it('frees a Drone in one tap', () => {
    const seated = seatStudentByHand(withOne(), 'ttf-0001', 'Amira', 5_000)
    expect(freeDroneSeat(seated, 'ttf-0001').seats).toHaveLength(0)
    // A Drone nobody has is already free, so this is a no-op rather than an error.
    expect(freeDroneSeat(withOne(), 'ttf-0001').seats).toHaveLength(0)
  })

  /*
   * A Student who picks up a second iPad gets a second `studentId`, so their own craft would
   * be greyed out against them forever. Two children with one first name is what this gets
   * wrong, and it gets it wrong where the Teacher can see it.
   */
  it('lets a Student reclaim their own Drone from a device that died', () => {
    const dead = joinClassroomAsStudent(withOne(), 'Amira', 1_000, 'stu-old').session
    const holding = takeDroneSeat(dead, 'stu-old', 'ttf-0001')
    window.localStorage.removeItem(STUDENT_SEAT_KEY)
    const fresh = joinClassroomAsStudent(holding, 'Amira', 2_000, 'stu-new').session

    expect(canTakeDrone(fresh, 'stu-new', 'ttf-0001')).toBe(true)
    const reclaimed = takeDroneSeat(fresh, 'stu-new', 'ttf-0001')

    expect(reclaimed.seats).toHaveLength(1)
    expect(reclaimed.seats[0]?.studentId).toBe('stu-new')
    expect(reclaimed.seats[0]?.droneId).toBe('ttf-0001')
  })

  it('still refuses a Drone another child has', () => {
    const first = joinClassroomAsStudent(withOne(), 'Amira', 1_000, 'stu-amira').session
    const holding = takeDroneSeat(first, 'stu-amira', 'ttf-0001')
    window.localStorage.removeItem(STUDENT_SEAT_KEY)
    const second = joinClassroomAsStudent(holding, 'Ben', 2_000, 'stu-ben').session

    expect(canTakeDrone(second, 'stu-ben', 'ttf-0001')).toBe(false)
    expect(takeDroneSeat(second, 'stu-ben', 'ttf-0001').seats).toHaveLength(2)
  })
})

/**
 * The heartbeat, both ways.
 *
 * Nothing tracked liveness, so a child whose iPad died looked exactly like a child flying
 * happily, and a tablet that had lost the Wi-Fi went on showing the last numbers it was sent
 * as though they were live.
 */
describe('when a screen goes quiet', () => {
  const withOne = () =>
    openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 6',
      scenarioId: null,
      scenarioName: '',
      objective: '',
      rules: [],
      limitMinutes: 20,
      zones: [],
      drones: [{ droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 }],
    })

  it('says nothing about a seat that is answering', () => {
    joinClassroomAsStudent(withOne(), 'Amira', 1_000, 'stu-amira')
    const beat = touchSeat('stu-amira', 100_000)!

    expect(quietSeats(beat, 100_000 + QUIET_AFTER_MS - 1)).toHaveLength(0)
  })

  it('names the Drone once its tablet has been quiet for forty seconds', () => {
    const joined = joinClassroomAsStudent(withOne(), 'Amira', 1_000, 'stu-amira').session
    takeDroneSeat(joined, 'stu-amira', 'ttf-0001')
    touchSeat('stu-amira', 100_000)

    const quiet = quietSeats(readClassroomSession()!, 100_000 + QUIET_AFTER_MS)
    expect(quiet).toHaveLength(1)
    expect(quiet[0]?.droneName).toBe('Drone 1')
    expect(quiet[0]?.quietForMs).toBe(QUIET_AFTER_MS)
  })

  /*
   * A child the Teacher seated by hand has no tablet on purpose. Reporting them as silent
   * would be an alarm about the Teacher's own decision.
   */
  it('never reports a child who was seated by hand', () => {
    const seated = seatStudentByHand(withOne(), 'ttf-0001', 'Ben', 1_000)

    expect(quietSeats(seated, 1_000 + 10 * QUIET_AFTER_MS)).toHaveLength(0)
  })

  it('tells the tablet when the board has stopped answering', () => {
    withOne()
    const beat = touchBoard(100_000)!

    expect(boardQuietForMs(beat, 100_000 + QUIET_AFTER_MS - 1)).toBeNull()
    expect(boardQuietForMs(beat, 100_000 + QUIET_AFTER_MS)).toBe(QUIET_AFTER_MS)
  })

  /*
   * A session a Student pulled from the cloud before the Teacher's board had ticked once.
   * Absent is not "lost", and saying so would be the tablet inventing bad news.
   */
  it('says nothing when the board has never checked in', () => {
    expect(boardQuietForMs(withOne(), 10_000_000)).toBeNull()
  })

  /*
   * Both sides write the same document on a timer. Each writer starts from the session it is
   * handed, so a heartbeat that held a stale copy would drop whatever landed in between.
   */
  it('reads the session fresh, so a beat never overwrites what just arrived', () => {
    const opened = withOne()
    touchBoard(100_000)
    // The Teacher grants while this tablet is holding a session from before the beat.
    seatStudentByHand(readClassroomSession()!, 'ttf-0001', 'Amira', 100_500)

    void opened
    touchBoard(110_000)

    const after = readClassroomSession()!
    expect(after.boardSeenAt).toBe(110_000)
    expect(after.seats.map((seat) => seat.name)).toEqual(['Amira'])
  })
})

/**
 * No Student, no takeoff.
 *
 * In a real classroom a Drone with no child holding a controller does not fly, and the queue
 * already works that way: `shouldAwaitClearance` refuses a craft with nobody on it. What was
 * wrong is where the board looked for that child.
 */
describe('who is flying this Drone', () => {
  const withOne = () =>
    openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 6',
      scenarioId: null,
      scenarioName: '',
      objective: '',
      rules: [],
      limitMinutes: 20,
      zones: [],
      drones: [{ droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 }],
    })

  it('is nobody when nobody joined and nobody was assigned', () => {
    expect(studentOnDrone(withOne(), 'ttf-0001', null)).toBeNull()
    expect(studentOnDrone(null, 'ttf-0001', null)).toBeNull()
  })

  it('is the child who took it on their own tablet', () => {
    const joined = joinClassroomAsStudent(withOne(), 'Amira', 1_000, 'stu-amira').session
    const taken = takeDroneSeat(joined, 'stu-amira', 'ttf-0001')

    expect(studentOnDrone(taken, 'ttf-0001', null)).toBe('stu-amira')
  })

  /* A child the Teacher put on by hand is a Student here exactly as they are in the room. */
  it('is the child the Teacher seated by hand', () => {
    const seated = seatStudentByHand(withOne(), 'ttf-0001', 'Ben', 1_000)

    expect(studentOnDrone(seated, 'ttf-0001', null)).not.toBeNull()
  })

  it('falls back to the Logbook assignment, and the seat beats it', () => {
    expect(studentOnDrone(withOne(), 'ttf-0001', 'stu-from-logbook')).toBe('stu-from-logbook')

    const joined = joinClassroomAsStudent(withOne(), 'Amira', 1_000, 'stu-amira').session
    const taken = takeDroneSeat(joined, 'stu-amira', 'ttf-0001')
    expect(studentOnDrone(taken, 'ttf-0001', 'stu-from-logbook')).toBe('stu-amira')
  })
})

/**
 * A tablet can leave a classroom, and an old code stops working.
 *
 * The owner opened the Student app on an iPhone and found it sitting in a lesson called
 * "bleble" that had finished weeks earlier, with no way out. Three causes, one story: there
 * was no way to leave, the code never changed, and nothing had ever said the lesson was over.
 */
describe('leaving a classroom', () => {
  const openFor = (lessonId: string | null) =>
    openClassroom({
      lessonId,
      lessonLabel: 'Year 6',
      scenarioId: null,
      scenarioName: '',
      objective: '',
      rules: [],
      limitMinutes: 20,
      zones: [],
      drones: [{ droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 }],
    })

  /*
   * `input.code ?? existing?.code ?? mint(now)` reused the first code a board ever minted for
   * every lesson after it, so last week's four letters opened today's class and a tablet
   * could not tell today from last month.
   */
  it('mints a new code for a new Lesson', () => {
    const first = openFor('lesson-1').code
    const second = openFor('lesson-2').code

    expect(first).not.toBe(second)
    expect(second).toHaveLength(4)
  })

  /* A Teacher who reloads mid-lesson must not find the code they read out has changed. */
  it('keeps the code while the Lesson does', () => {
    const first = openFor('lesson-1').code
    expect(openFor('lesson-1').code).toBe(first)
  })

  /*
   * The failure this fixes: two runs with no Logbook Lesson both carry `lessonId: null`, and
   * `null === null` handed the second one the first one's code. The first had ended, so every
   * tablet typing the code the Teacher read out found a classroom stamped `endedAt`.
   */
  it('mints a new code after a classroom with no Lesson has ended', () => {
    const first = openFor(null).code
    closeClassroom(9_000)

    const second = openFor(null).code

    expect(second).not.toBe(first)
    expect(second).toHaveLength(4)
    expect(classroomHasEnded(readClassroomSession())).toBe(false)
  })

  /* Same rule for a Lesson that is named: ending it is the Teacher saying the room is over. */
  it('mints a new code after a named Lesson has ended', () => {
    const first = openFor('lesson-1').code
    closeClassroom(9_000)

    expect(openFor('lesson-1').code).not.toBe(first)
  })

  /* And a run with no Lesson still survives a reload, which is why the ids are still read. */
  it('keeps the code across a reload when there is no Lesson', () => {
    const first = openFor(null).code
    expect(openFor(null).code).toBe(first)
  })

  it('starts a new Lesson with nobody seated', () => {
    joinClassroomAsStudent(openFor('lesson-1'), 'Amira', 1_000, 'stu-amira')
    expect(readClassroomSession()?.seats).toHaveLength(1)

    expect(openFor('lesson-2').seats).toHaveLength(0)
  })

  it('says the classroom is over, and keeps saying it', () => {
    openFor('lesson-1')
    expect(classroomHasEnded(readClassroomSession())).toBe(false)

    closeClassroom(9_000)
    expect(classroomHasEnded(readClassroomSession())).toBe(true)
    expect(readClassroomSession()?.endedAt).toBe(9_000)
    expect(readClassroomSession()?.live).toBe(false)

    // Idempotent: closing twice does not restamp the moment it ended.
    closeClassroom(20_000)
    expect(readClassroomSession()?.endedAt).toBe(9_000)
  })

  /* The seats are the record of who flew what. Closing a Lesson does not un-teach it. */
  it('keeps the seats when the classroom closes', () => {
    joinClassroomAsStudent(openFor('lesson-1'), 'Amira', 1_000, 'stu-amira')
    closeClassroom(9_000)

    expect(readClassroomSession()?.seats).toHaveLength(1)
  })

  it('refuses a code for a lesson that has ended', async () => {
    const code = openFor('lesson-1').code
    expect(await loadClassroomByCode(code)).not.toBeNull()

    closeClassroom(9_000)
    expect(await loadClassroomByCode(code)).toBeNull()
  })

  /* There was no `leaveClassroom` anywhere. Once joined, joined forever. */
  it('forgets the seat and the session on this device only', () => {
    joinClassroomAsStudent(openFor('lesson-1'), 'Amira', 1_000, 'stu-amira')
    expect(window.localStorage.getItem(STUDENT_SEAT_KEY)).not.toBeNull()

    leaveClassroom()

    expect(window.localStorage.getItem(STUDENT_SEAT_KEY)).toBeNull()
    expect(window.localStorage.getItem(CLASSROOM_SESSION_KEY)).toBeNull()
    expect(readClassroomSession()).toBeNull()
  })

  /* Opening a classroom is the opposite of ending one, whatever the last one did. */
  it('clears the ended stamp when a new classroom opens', () => {
    openFor('lesson-1')
    closeClassroom(9_000)

    expect(classroomHasEnded(openFor('lesson-2'))).toBe(false)
  })
})

/**
 * Who else is in the room, from one child's point of view.
 *
 * The team is found by the Drone rather than by matching roster ids, because the Drone is the
 * one thing both halves agree on: a Teacher puts a team on a craft, and a child taps the
 * number painted on the craft in their hands.
 */
describe('who else is in the room', () => {
  const withTeams = () =>
    openClassroom({
      lessonId: 'lesson-1',
      lessonLabel: 'Year 6',
      scenarioId: null,
      scenarioName: '',
      objective: '',
      rules: [],
      limitMinutes: 20,
      zones: [],
      drones: [
        { droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 },
        { droneId: 'ttf-0002', droneName: 'Drone 2', number: 2 },
      ],
      teams: [
        { id: 'team-1', name: 'Red Team', droneId: 'ttf-0001' },
        { id: 'team-2', name: 'Blue Team', droneId: 'ttf-0002' },
      ],
    })

  const twoChildren = () => {
    const amira = joinClassroomAsStudent(withTeams(), 'Amira', 1_000, 'stu-amira').session
    const seated = takeDroneSeat(amira, 'stu-amira', 'ttf-0001')
    window.localStorage.removeItem(STUDENT_SEAT_KEY)
    const ben = joinClassroomAsStudent(seated, 'Ben', 2_000, 'stu-ben').session
    return takeDroneSeat(ben, 'stu-ben', 'ttf-0002')
  }

  it('names the team by the craft the child is holding', () => {
    const room = roomAround(twoChildren(), 'stu-amira')

    expect(room.teamName).toBe('Red Team')
    expect(room.mine?.name).toBe('Amira')
  })

  it('lists everybody else, oldest join first, and never the child themselves', () => {
    const room = roomAround(twoChildren(), 'stu-amira')

    expect(room.others.map((seat) => seat.name)).toEqual(['Ben'])
    expect(room.others.some((seat) => seat.studentId === 'stu-amira')).toBe(false)
  })

  /* No team named for this craft is a real answer, and inventing one would be worse. */
  it('says nothing about a team when the Teacher named none', () => {
    const bare = openClassroom({
      lessonId: 'lesson-2',
      lessonLabel: 'Year 6',
      scenarioId: null,
      scenarioName: '',
      objective: '',
      rules: [],
      limitMinutes: 20,
      zones: [],
      drones: [{ droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 }],
    })
    const joined = joinClassroomAsStudent(bare, 'Amira', 1_000, 'stu-amira').session
    const seated = takeDroneSeat(joined, 'stu-amira', 'ttf-0001')

    expect(roomAround(seated, 'stu-amira').teamName).toBeNull()
  })

  /*
   * The Teacher's list is keyed by Drone, so a child who typed their name and put the tablet
   * down was in the room and on no row.
   */
  it('counts a child who joined and took no craft', () => {
    const joined = joinClassroomAsStudent(withTeams(), 'Amira', 1_000, 'stu-amira').session

    expect(seatsWithoutADrone(joined).map((seat) => seat.name)).toEqual(['Amira'])
    expect(seatsWithoutADrone(takeDroneSeat(joined, 'stu-amira', 'ttf-0001'))).toHaveLength(0)
  })
})

/**
 * Whether the way out belongs on a child's screen.
 *
 * The airborne half is unreachable in the jsdom suite — the pinned demonstration never leaves
 * the ground — so it is pinned here, on the rule itself, rather than left to a browser walk
 * that only ever exercises three of the four answers.
 */
describe('whether a child may leave a classroom', () => {
  it('lets a child on the ground leave', () => {
    expect(mayLeaveClassroom({ airborne: false, boardQuiet: false })).toBe(true)
  })

  /* Never take the screen away from a child holding a flying aircraft. */
  it('refuses a child whose Drone is genuinely up', () => {
    expect(mayLeaveClassroom({ airborne: true, boardQuiet: false })).toBe(false)
  })

  /*
   * The trap this exists to remove: "airborne" is the last thing the board said, and a board
   * that has stopped speaking is not saying it any more.
   */
  it('lets a child out when the board has gone quiet, whatever it last said', () => {
    expect(mayLeaveClassroom({ airborne: true, boardQuiet: true })).toBe(true)
    expect(mayLeaveClassroom({ airborne: false, boardQuiet: true })).toBe(true)
  })
})

/**
 * One bug with two faces: the seat that is written and never read back.
 *
 * A Student taps a Drone and the screen bounces straight back to the Drone picker. The
 * Teacher's board says "Nobody is waiting" about the same child. Both are the same lost
 * update: one document, two kinds of writer, and whole-document last-write-wins between them.
 *
 * The board owns the lesson and beats a heartbeat into the document every ten seconds; each
 * tablet owns one seat. The tablet's write was refused by the store as stale, and the board's
 * poll could not see a seat that did reach it, because the poll asked "is the remote newer
 * than mine" and the heartbeat guaranteed it never was.
 */
describe('one bug with two faces', () => {
  const room = (over: Partial<ClassroomSession> = {}): ClassroomSession => ({
    ...openClassroom({
      lessonId: 'L-1',
      lessonLabel: 'Year 8',
      scenarioId: null,
      scenarioName: '',
      objective: '',
      rules: [],
      limitMinutes: 20,
      zones: [],
      drones: [
        { droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 },
        { droneId: 'ttf-0002', droneName: 'Drone 2', number: 2 },
      ],
    }),
    ...over,
  })

  const seat = (over: Partial<ClassroomSeat> & { studentId: string }): ClassroomSeat => ({
    name: over.studentId,
    droneId: null,
    droneName: null,
    phase: 'briefing',
    takeoffRequestedAt: null,
    clearedAt: null,
    heldAt: null,
    flownAt: null,
    reachedCheckpointIds: [],
    approvedAt: null,
    score: null,
    joinedAt: 1_000,
    seenAt: 1_000,
    ...over,
  })

  /* The Teacher's face of it: the board must see a child it has never heard of. */
  it('keeps a seat the newer copy has never heard of', () => {
    const tablet = room({ updatedAt: 1_100, seats: [seat({ studentId: 'stu-kntl' })] })
    const boardHeartbeat = room({ updatedAt: 1_200, seats: [] })

    const merged = mergeClassroomSessions(boardHeartbeat, tablet)

    expect(merged.seats.map((row) => row.studentId)).toEqual(['stu-kntl'])
  })

  /*
   * The Student's face of it: a tablet that has just taken Drone 1 must not be handed a copy
   * that has it back on the picker. This is the bounce, exactly.
   */
  it('does not take a Drone back off a child who has just tapped it', () => {
    const tookADrone = room({
      updatedAt: 1_100,
      seats: [
        seat({ studentId: 'stu-kntl', droneId: 'ttf-0001', droneName: 'Drone 1', seenAt: 1_100 }),
      ],
    })
    const boardCopy = room({
      updatedAt: 1_300,
      seats: [seat({ studentId: 'stu-kntl', droneId: null, seenAt: 1_000 })],
    })

    const merged = mergeClassroomSessions(boardCopy, tookADrone)

    expect(merged.seats[0]?.droneId).toBe('ttf-0001')
  })

  it('takes the lesson from the newer copy while keeping both seats', () => {
    const tablet = room({ updatedAt: 1_100, seats: [seat({ studentId: 'stu-kntl' })] })
    const board = room({
      updatedAt: 1_200,
      objective: 'the new objective',
      seats: [seat({ studentId: 'stu-sam', joinedAt: 1_150, seenAt: 1_150 })],
    })

    const merged = mergeClassroomSessions(board, tablet)

    expect(merged.objective).toBe('the new objective')
    expect(merged.seats.map((row) => row.studentId)).toEqual(['stu-kntl', 'stu-sam'])
  })

  it('is stable when both copies already agree', () => {
    const one = room({ updatedAt: 1_500, seats: [seat({ studentId: 'stu-kntl' })] })

    expect(mergeClassroomSessions(one, one).seats).toHaveLength(1)
  })
})
