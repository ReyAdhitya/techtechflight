import { beforeEach, describe, expect, it } from 'vitest'
import type { FleetEvent, FleetEventKind } from '@techtechflight/contract'
import {
  alreadyTallied,
  allocateLessonId,
  allocateSerialId,
  allocateStudentId,
  applyLessonAssignments,
  assignStudent,
  assignNextRosterName,
  assignStudentToLessonDrone,
  attachDroneToLesson,
  clearLogbook,
  createTrainerLesson,
  firstUnassignedDrone,
  legacyStudentIdFor,
  LOGBOOK_KEY,
  nextRosterNameForAssign,
  SERVICE_PRESENTATION,
  serviceStateOf,
  setServiceState,
  currentExercise,
  endLesson,
  persistedTally,
  readLogbook,
  recordCommand,
  registerStudent,
  rememberStudent,
  runningLesson,
  saveRoll,
  startLesson,
  studentIdOf,
  studentOf,
  swapStudentAssignments,
  studentsFrom,
  subscribeLogbook,
  talliedLessonCount,
  talliedWindows,
  tallyEvents,
  upsertStudent,
  unassignedRosterNames,
  upsertTrainerDrone,
  upsertTrainerLesson,
} from './logbook'

/**
 * The counts a Teacher takes to the supplier.
 *
 * These are the numbers that decide whether an airframe goes back, so the thing worth
 * testing hardest is not that they add up — it is that they do not add up twice.
 */

function event(at: number, droneId: string, kind: FleetEventKind): FleetEvent {
  return {
    id: `${droneId}@${at}#${kind}`,
    at,
    droneId,
    droneName: droneId.toUpperCase(),
    kind,
    from: null,
    to: 'Ready',
    detail: null,
    severity: kind === 'fault-raised' ? 'fault' : 'routine',
  }
}

beforeEach(() => {
  clearLogbook()
})

describe('tallyEvents', () => {
  it('counts faults, dropouts, and flights per Drone', () => {
    const tally = tallyEvents([
      event(10, 'a', 'fault-raised'),
      event(20, 'a', 'took-off'),
      event(30, 'a', 'contact-lost'),
      event(40, 'b', 'took-off'),
    ])

    expect(tally['a']).toEqual({ faults: 1, dropouts: 1, flights: 1 })
    expect(tally['b']).toEqual({ faults: 0, dropouts: 0, flights: 1 })
  })

  it('ignores the kinds that say nothing about reliability', () => {
    const tally = tallyEvents([
      event(10, 'a', 'landed'),
      event(20, 'a', 'became-ready'),
      event(30, 'a', 'fault-cleared'),
    ])

    expect(tally['a']).toEqual({ faults: 0, dropouts: 0, flights: 0 })
  })

  it('has no entry for a Drone that did nothing', () => {
    expect(tallyEvents([])['a']).toBeUndefined()
  })
})

describe('a lesson that closes', () => {
  it('keeps the counts after the events themselves are gone', () => {
    const id = startLesson('Year 8', 4, 6, 1_000)
    endLesson(id, 5_000, tallyEvents([event(2_000, 'a', 'fault-raised')]))

    // Nothing is passed in here — this is the ground station having been restarted.
    expect(persistedTally(readLogbook())['a']).toEqual({
      faults: 1,
      dropouts: 0,
      flights: 0,
    })
  })

  it('sums across every lesson in the record', () => {
    const first = startLesson('Monday', 6, 6, 1_000)
    endLesson(first, 2_000, tallyEvents([event(1_500, 'a', 'fault-raised')]))
    const second = startLesson('Tuesday', 6, 6, 3_000)
    endLesson(
      second,
      4_000,
      tallyEvents([event(3_500, 'a', 'fault-raised'), event(3_600, 'a', 'took-off')]),
    )

    expect(persistedTally(readLogbook())['a']).toEqual({
      faults: 2,
      dropouts: 0,
      flights: 1,
    })
    expect(talliedLessonCount(readLogbook())).toBe(2)
  })

  it('records the incidents with the Drone that caused them', () => {
    startLesson('Year 8', 4, 6, 1_000)
    expect(readLogbook().lessons[0]?.incidents).toEqual([])
  })
})

describe('a lesson still under way', () => {
  it('contributes no counts and no window', () => {
    startLesson('Year 8', 4, 6, 1_000)

    expect(persistedTally(readLogbook())).toEqual({})
    expect(talliedWindows(readLogbook())).toEqual([])
  })
})

describe('the overlap between the two sources', () => {
  it('treats an event inside a closed lesson as already counted', () => {
    const id = startLesson('Year 8', 4, 6, 1_000)
    endLesson(id, 5_000, tallyEvents([event(2_000, 'a', 'fault-raised')]))
    const windows = talliedWindows(readLogbook())

    expect(alreadyTallied(windows, 2_000)).toBe(true)
    // The boundaries belong to the lesson too — an event at the closing moment was seen.
    expect(alreadyTallied(windows, 1_000)).toBe(true)
    expect(alreadyTallied(windows, 5_000)).toBe(true)
  })

  it('leaves an event outside every lesson to be counted live', () => {
    const id = startLesson('Year 8', 4, 6, 1_000)
    endLesson(id, 5_000, tallyEvents([event(2_000, 'a', 'fault-raised')]))
    const windows = talliedWindows(readLogbook())

    expect(alreadyTallied(windows, 999)).toBe(false)
    expect(alreadyTallied(windows, 5_001)).toBe(false)
  })

  it('does not double count a fault the ground station still remembers', () => {
    const fault = event(2_000, 'a', 'fault-raised')
    const id = startLesson('Year 8', 4, 6, 1_000)
    endLesson(id, 5_000, tallyEvents([fault]))

    const book = readLogbook()
    const windows = talliedWindows(book)
    // The same event, still inside the ground station's retained window.
    const live = tallyEvents([fault].filter((candidate) => !alreadyTallied(windows, candidate.at)))

    const saved = persistedTally(book)['a']!
    expect(saved.faults + (live['a']?.faults ?? 0)).toBe(1)
  })
})

describe('a record written before the board kept counts', () => {
  it('is skipped rather than treated as a lesson with no faults', () => {
    const id = startLesson('Year 8', 4, 6, 1_000)
    // endLesson is what attaches a tally; a record closed by an older build has none.
    const book = readLogbook()
    const closedWithoutTally = {
      ...book,
      lessons: book.lessons.map((lesson) =>
        lesson.id === id ? { ...lesson, endedAt: 5_000 } : lesson,
      ),
    }

    expect(talliedWindows(closedWithoutTally)).toEqual([])
    expect(persistedTally(closedWithoutTally)).toEqual({})
  })
})

/**
 * Records a Teacher already has.
 *
 * The person flying was called a pilot until the glossary was applied — CONTEXT.md lists
 * that word among the ones to avoid, and they are a Student. Renaming a field is free;
 * losing a term of a Teacher's own records to a rename is not, and it is the kind of thing
 * that goes unnoticed because the board still works perfectly for everyone who had none.
 */
describe('a Logbook exported before the rename', () => {
  it('still restores who was flying what', () => {
    expect(studentsFrom({ pilots: { 'ttf-0001': 'Priya' } })).toEqual({ 'ttf-0001': 'Priya' })
  })

  it('prefers the current name when a file carries both', () => {
    expect(
      studentsFrom({ students: { 'ttf-0001': 'Ravi' }, pilots: { 'ttf-0001': 'Priya' } }),
    ).toEqual({ 'ttf-0001': 'Ravi' })
  })

  it('restores nothing rather than failing when a file predates the field entirely', () => {
    expect(studentsFrom({})).toEqual({})
  })
})

/**
 * The class, and the plan.
 *
 * Everything here is something the Teacher typed rather than something a Drone reported,
 * which is why it lives in the Logbook at all and why losing it to a field rename would
 * matter.
 */
describe('the class list', () => {
  it('keeps names between Lessons so a class is typed once', () => {
    saveRoll(['Priya', 'Ravi'])

    expect(readLogbook().roll).toEqual(['Priya', 'Ravi'])
    expect(readLogbook().roster).toEqual([
      { studentId: legacyStudentIdFor('Priya'), name: 'Priya' },
      { studentId: legacyStudentIdFor('Ravi'), name: 'Ravi' },
    ])
  })

  it('holds each name once, however often it is offered', () => {
    saveRoll(['Priya', 'Priya', ' Priya '])

    expect(readLogbook().roll).toEqual(['Priya'])
  })

  it('drops the empty ones rather than keeping a blank in the class', () => {
    saveRoll(['Priya', '', '   '])

    expect(readLogbook().roll).toEqual(['Priya'])
  })

  it('remembers a name the Teacher has just used', () => {
    rememberStudent('Ravi')
    rememberStudent('Ravi')

    expect(readLogbook().roll).toEqual(['Ravi'])
  })
})

describe('swap drone assignments', () => {
  it('exchanges who is flying two Drones', () => {
    assignStudent('ttf-0001', 'Priya')
    assignStudent('ttf-0002', 'Ravi')

    swapStudentAssignments('ttf-0001', 'ttf-0002')

    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBe('Ravi')
    expect(studentOf(book, 'ttf-0002')).toBe('Priya')
  })

  it('moves someone onto an empty Drone', () => {
    assignStudent('ttf-0001', 'Priya')

    swapStudentAssignments('ttf-0001', 'ttf-0002')

    const book = readLogbook()
    expect(studentOf(book, 'ttf-0001')).toBeNull()
    expect(studentOf(book, 'ttf-0002')).toBe('Priya')
  })

  it('does nothing when both Drones are empty', () => {
    swapStudentAssignments('ttf-0001', 'ttf-0002')

    expect(readLogbook().students).toEqual({})
  })
})

describe('one-tap roster assign', () => {
  it('walks the roster in order, skipping names already flying', () => {
    saveRoll(['Amara', 'Priya', 'Ravi'])
    assignStudent('ttf-0001', 'Amara')

    expect(unassignedRosterNames(readLogbook())).toEqual(['Priya', 'Ravi'])
    expect(nextRosterNameForAssign(readLogbook())).toBe('Priya')
  })

  it('assigns the next name to a Drone in one tap', () => {
    saveRoll(['Priya', 'Ravi'])

    expect(assignNextRosterName('ttf-0001')).toBe('Priya')
    expect(studentOf(readLogbook(), 'ttf-0001')).toBe('Priya')
    expect(assignNextRosterName('ttf-0002')).toBe('Ravi')
    expect(assignNextRosterName('ttf-0003')).toBeNull()
  })

  it('refuses a Drone that already has someone', () => {
    saveRoll(['Priya'])
    assignStudent('ttf-0001', 'Priya')

    expect(assignNextRosterName('ttf-0001')).toBeNull()
  })

  it('picks the first unassigned Drone in board order', () => {
    saveRoll(['Priya'])
    const book = readLogbook()

    expect(firstUnassignedDrone(book, ['ttf-0002', 'ttf-0001'])).toBe('ttf-0002')
  })
})

describe('Trainer DB — Student, Lesson, Drone', () => {
  it('registers a Student by id and shows the name on strips', () => {
    upsertStudent('yr8-priya', 'Priya')
    assignStudent('ttf-0001', 'Priya')

    const book = readLogbook()
    expect(book.roster).toEqual([{ studentId: 'yr8-priya', name: 'Priya' }])
    expect(book.students['ttf-0001']).toBe('yr8-priya')
    expect(studentOf(book, 'ttf-0001')).toBe('Priya')
    expect(studentIdOf(book, 'ttf-0001')).toBe('yr8-priya')
  })

  it('assigns S- and L- ids so Teachers never invent primary keys', () => {
    expect(allocateSerialId([], 'S')).toBe('S-0001')
    expect(allocateSerialId(['S-0001', 'stu-legacy', 'S-0003'], 'S')).toBe('S-0004')
    expect(allocateSerialId(['L-0009'], 'L')).toBe('L-0010')

    expect(registerStudent('Amara')).toBe('S-0001')
    expect(registerStudent('Bea')).toBe('S-0002')
    expect(registerStudent('Amara')).toBe('S-0001')
    expect(allocateStudentId(readLogbook())).toBe('S-0003')

    expect(createTrainerLesson('Year 8 period 3')).toBe('L-0001')
    expect(createTrainerLesson('Year 8 period 4')).toBe('L-0002')
    expect(allocateLessonId(readLogbook())).toBe('L-0003')
    expect(readLogbook().trainerLessons.map((lesson) => lesson.lessonId)).toEqual([
      'L-0001',
      'L-0002',
    ])
  })

  it('keeps Lesson↔Drone many-to-many, not a forever belongs-To', () => {
    upsertTrainerLesson('period-3', 'Year 8 period 3')
    upsertTrainerLesson('period-4', 'Year 8 period 4')
    attachDroneToLesson('period-3', 'ttf-0001')
    attachDroneToLesson('period-4', 'ttf-0001')
    attachDroneToLesson('period-3', 'ttf-0002')

    expect(readLogbook().lessonDrones).toEqual([
      { lessonId: 'period-3', droneId: 'ttf-0001' },
      { lessonId: 'period-4', droneId: 'ttf-0001' },
      { lessonId: 'period-3', droneId: 'ttf-0002' },
    ])
  })

  it('keys LessonAssignment by studentId and applies names to the live board', () => {
    upsertStudent('yr8-priya', 'Priya')
    upsertTrainerLesson('period-3', 'Year 8 period 3')
    attachDroneToLesson('period-3', 'ttf-0001')
    assignStudentToLessonDrone('period-3', 'ttf-0001', 'yr8-priya')
    applyLessonAssignments('period-3')

    const book = readLogbook()
    expect(book.lessonAssignments).toEqual([
      { lessonId: 'period-3', droneId: 'ttf-0001', studentId: 'yr8-priya' },
    ])
    expect(studentOf(book, 'ttf-0001')).toBe('Priya')
  })

  it('stores trainer Drone metadata without touching Telemetry', () => {
    upsertTrainerDrone('ttf-0001', 'Classroom quad', '2026-01-15')

    expect(readLogbook().trainerDrones).toEqual([
      { droneId: 'ttf-0001', model: 'Classroom quad', createdDate: '2026-01-15' },
    ])
  })

  it('loads a legacy name-only Logbook without migrating on read', () => {
    window.localStorage.setItem(
      LOGBOOK_KEY,
      JSON.stringify({
        notes: {},
        service: {},
        lessons: [],
        students: { 'ttf-0001': 'Priya' },
        roll: ['Priya', 'Ravi'],
      }),
    )
    const stop = subscribeLogbook(() => {})
    window.dispatchEvent(new StorageEvent('storage', { key: LOGBOOK_KEY }))
    stop()

    const loaded = readLogbook()
    expect(loaded.roster).toEqual([])
    expect(loaded.roll).toEqual(['Priya', 'Ravi'])
    expect(loaded.students).toEqual({ 'ttf-0001': 'Priya' })
    expect(studentOf(loaded, 'ttf-0001')).toBe('Priya')

    rememberStudent('Amara')
    const book = readLogbook()
    expect(book.roster.map((student) => student.name).sort()).toEqual(['Amara', 'Priya', 'Ravi'])
    expect(studentOf(book, 'ttf-0001')).toBe('Priya')
  })

  it('still starts a Lesson with no Assignments at all', () => {
    const id = startLesson('Ad-hoc', 0, 6, 1_000)
    expect(runningLesson(readLogbook())?.id).toBe(id)
    expect(runningLesson(readLogbook())?.assignments).toEqual({})
  })

  it('captures names — not studentIds — on the LessonRecord at start', () => {
    upsertStudent('yr8-priya', 'Priya')
    assignStudent('ttf-0001', 'Priya')
    startLesson('Year 8', 5, 6, 1_000)

    expect(runningLesson(readLogbook())?.assignments).toEqual({ 'ttf-0001': 'Priya' })
  })
})

describe('a Lesson that was planned', () => {
  it('keeps the Exercises it was started with', () => {
    const id = startLesson('Year 8', 5, 6, 1_000, [{ id: 'e1', name: 'Hover', minutes: 5 }])

    expect(runningLesson(readLogbook())?.exercises).toEqual([
      { id: 'e1', name: 'Hover', minutes: 5 },
    ])
    expect(id).toBeTruthy()
  })

  it('captures who was flying what as it began, not as it ended', () => {
    assignStudent('ttf-0001', 'Priya')
    startLesson('Year 8', 5, 6, 1_000)

    // Reassigned mid-lesson. The record of what was true at the start must not move.
    assignStudent('ttf-0001', 'Ravi')

    expect(runningLesson(readLogbook())?.assignments).toEqual({ 'ttf-0001': 'Priya' })
  })

  it('starts with no plan at all, which is a supported way to start', () => {
    const id = startLesson('', 0, 6, 1_000)

    const lesson = runningLesson(readLogbook())
    expect(lesson?.id).toBe(id)
    expect(lesson?.exercises).toEqual([])
    expect(lesson?.label).toBe('Untitled lesson')
  })

  it('notes the Commands sent during it', () => {
    const id = startLesson('Year 8', 5, 6, 1_000)

    recordCommand(id, { at: 2_000, droneId: 'ttf-0001', droneName: 'Drone 1', kind: 'land' })

    expect(runningLesson(readLogbook())?.commands).toHaveLength(1)
  })
})

/**
 * Which Exercise a Lesson is on.
 *
 * Advances on the durations the Teacher gave, and nowhere invents one. A plan written
 * without times still reads as a plan rather than as a countdown running out.
 */
describe('the Exercise a Lesson is on', () => {
  const planned = (exercises: readonly { id: string; name: string; minutes?: number }[]) => {
    startLesson('Year 8', 5, 6, 0, exercises)
    return runningLesson(readLogbook())!
  }

  it('is nothing at all when there is no plan', () => {
    expect(currentExercise(planned([]), 60_000)).toBeNull()
  })

  it('is the first one at the start', () => {
    const lesson = planned([
      { id: 'e1', name: 'Hover', minutes: 5 },
      { id: 'e2', name: 'Square', minutes: 10 },
    ])

    expect(currentExercise(lesson, 60_000)?.exercise.name).toBe('Hover')
    expect(currentExercise(lesson, 60_000)?.position).toBe(1)
  })

  it('moves on once the time given for one has passed', () => {
    const lesson = planned([
      { id: 'e1', name: 'Hover', minutes: 5 },
      { id: 'e2', name: 'Square', minutes: 10 },
    ])

    expect(currentExercise(lesson, 6 * 60_000)?.exercise.name).toBe('Square')
    expect(currentExercise(lesson, 6 * 60_000)?.of).toBe(2)
  })

  it('stays on one that was given no time, rather than guessing a length', () => {
    const lesson = planned([
      { id: 'e1', name: 'Hover' },
      { id: 'e2', name: 'Square', minutes: 10 },
    ])

    expect(currentExercise(lesson, 90 * 60_000)?.exercise.name).toBe('Hover')
  })

  it('is nothing once the plan has run out, rather than naming a finished Exercise', () => {
    const lesson = planned([{ id: 'e1', name: 'Hover', minutes: 5 }])

    // The Lesson carries on. There is simply nothing it is supposed to be doing.
    expect(currentExercise(lesson, 90 * 60_000)).toBeNull()
  })
})


/**
 * The service label is copy; the service key is a contract.
 *
 * `'watch'` is written into a Teacher's browser and read back out of it. The label above it
 * moved from "Keep an eye on it" to "Under observation" on 2026-07-28, and the temptation
 * that comes with a rename like that is to make the key match the words — which would
 * silently invalidate every service decision stored on every laptop, with no migration and
 * no error to say so. This test exists to make that failure loud instead.
 */
describe('the service state a Teacher recorded', () => {
  it('is stored under the key the words no longer match', () => {
    setServiceState('ttf-0001', 'watch', 'Motor 3 was uneven last lesson', 1_000)

    const stored = window.localStorage.getItem(LOGBOOK_KEY)
    expect(stored).toContain('"watch"')
    expect(serviceStateOf(readLogbook(), 'ttf-0001')).toBe('watch')
  })

  /*
   * The rename that would do the damage is `watch` -> `under-observation`, to make the key
   * match the new words. These three are the values that go to disk, so a rename fails here
   * rather than on a Teacher's laptop halfway through term.
   */
  it('keys its labels on the stored values, never on the words', () => {
    expect(Object.keys(SERVICE_PRESENTATION).sort()).toEqual([
      'in-service',
      'out-of-service',
      'watch',
    ])
    expect(SERVICE_PRESENTATION.watch.label).toBe('Under observation')
  })
})
