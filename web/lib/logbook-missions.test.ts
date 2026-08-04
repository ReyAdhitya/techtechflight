import { beforeEach, describe, expect, it } from 'vitest'
import {
  LOGBOOK_KEY,
  migrateMissionsForward,
  missionsFrom,
  readLogbook,
  rememberStudent,
  type LessonRecord,
  writeNote,
} from './logbook'
import { emptyMission } from './mission.ts'

beforeEach(() => {
  window.localStorage.removeItem(LOGBOOK_KEY)
})

const legacyExerciseLesson = (): LessonRecord => ({
  id: 'lesson-legacy',
  label: 'Year 8',
  startedAt: 1_000,
  endedAt: 2_000,
  readyAtStart: 4,
  fleetSize: 6,
  incidents: [],
  exercises: [
    { id: 'e1', name: 'Hover drill', minutes: 5 },
    { id: 'e2', name: 'Figure eight' },
  ],
})

describe('missionsFrom', () => {
  it('reads legacy exercises when no missions field exists', () => {
    const lesson = legacyExerciseLesson()

    expect(missionsFrom(lesson)).toEqual([
      {
        ...emptyMission('e1', 'legacy-exercise', 'Hover drill'),
        limitMinutes: 5,
      },
      emptyMission('e2', 'legacy-exercise', 'Figure eight'),
    ])
  })

  it('prefers missions when a record carries both', () => {
    const mission = emptyMission('m1', 'search-rescue', 'Find the casualty')
    const lesson: LessonRecord = {
      ...legacyExerciseLesson(),
      missions: [mission],
    }

    expect(missionsFrom(lesson)).toEqual([mission])
  })

  it('returns an empty list when neither field is set', () => {
    const lesson: LessonRecord = {
      id: 'lesson-empty',
      label: 'Ad-hoc',
      startedAt: 0,
      endedAt: null,
      readyAtStart: 0,
      fleetSize: 6,
      incidents: [],
    }

    expect(missionsFrom(lesson)).toEqual([])
  })

  it('returns an empty list when missions is explicitly empty', () => {
    const lesson: LessonRecord = {
      ...legacyExerciseLesson(),
      missions: [],
      exercises: [{ id: 'e1', name: 'Ignored when missions is present' }],
    }

    expect(missionsFrom(lesson)).toEqual([])
  })
})

describe('migrateMissionsForward', () => {
  it('converts exercise-only lessons and drops the legacy field', () => {
    const book = migrateMissionsForward({
      notes: {},
      service: {},
      lessons: [legacyExerciseLesson()],
      students: {},
      roll: [],
      roster: [],
      trainerDrones: [],
      trainerLessons: [],
      lessonDrones: [],
      lessonAssignments: [],
    })

    expect(book.lessons[0]?.exercises).toBeUndefined()
    expect(book.lessons[0]?.missions).toEqual(missionsFrom(legacyExerciseLesson()))
  })

  it('leaves lessons that already have missions unchanged', () => {
    const mission = emptyMission('m1', 'delivery', 'Drop at B')
    const lesson: LessonRecord = {
      ...legacyExerciseLesson(),
      missions: [mission],
    }
    const book = {
      notes: {},
      service: {},
      lessons: [lesson],
      students: {},
      roll: [],
      roster: [],
      trainerDrones: [],
      trainerLessons: [],
      lessonDrones: [],
      lessonAssignments: [],
    }

    expect(migrateMissionsForward(book).lessons[0]).toEqual(lesson)
  })

  it('does nothing when a lesson has no plan at all', () => {
    const lesson: LessonRecord = {
      id: 'lesson-none',
      label: 'Free fly',
      startedAt: 0,
      endedAt: null,
      readyAtStart: 0,
      fleetSize: 6,
      incidents: [],
      exercises: [],
    }
    const book = {
      notes: {},
      service: {},
      lessons: [lesson],
      students: {},
      roll: [],
      roster: [],
      trainerDrones: [],
      trainerLessons: [],
      lessonDrones: [],
      lessonAssignments: [],
    }

    expect(migrateMissionsForward(book).lessons[0]).toEqual(lesson)
  })
})

describe('a Logbook exported before Missions', () => {
  it('loads exercise-only lessons without migrating on read', () => {
    window.localStorage.setItem(
      LOGBOOK_KEY,
      JSON.stringify({
        notes: {},
        service: {},
        lessons: [legacyExerciseLesson()],
        students: {},
        roll: [],
      }),
    )

    const loaded = readLogbook()
    expect(loaded.lessons[0]?.exercises).toHaveLength(2)
    expect(loaded.lessons[0]?.missions).toBeUndefined()
    expect(missionsFrom(loaded.lessons[0]!)).toHaveLength(2)
  })

  it('persists missions after any write', () => {
    window.localStorage.setItem(
      LOGBOOK_KEY,
      JSON.stringify({
        notes: {},
        service: {},
        lessons: [legacyExerciseLesson()],
        students: {},
        roll: [],
      }),
    )
    readLogbook()

    writeNote('ttf-0001', 'Needs a prop check', 3_000)

    const book = readLogbook()
    expect(book.lessons[0]?.exercises).toBeUndefined()
    expect(book.lessons[0]?.missions).toEqual(missionsFrom(legacyExerciseLesson()))

    const raw = JSON.parse(window.localStorage.getItem(LOGBOOK_KEY) ?? '{}') as {
      lessons: LessonRecord[]
    }
    expect(raw.lessons[0]?.missions).toHaveLength(2)
    expect(raw.lessons[0]?.exercises).toBeUndefined()
  })

  it('migrates on write through roster migration paths too', () => {
    window.localStorage.setItem(
      LOGBOOK_KEY,
      JSON.stringify({
        notes: {},
        service: {},
        lessons: [legacyExerciseLesson()],
        students: {},
        roll: ['Priya'],
      }),
    )
    readLogbook()

    rememberStudent('Amara')

    expect(readLogbook().lessons[0]?.missions).toHaveLength(2)
    expect(readLogbook().lessons[0]?.exercises).toBeUndefined()
  })
})
