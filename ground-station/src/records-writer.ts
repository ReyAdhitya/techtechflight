import type { DatabaseSync } from 'node:sqlite'
import { openRecords, type RecordsDb } from './records-db.ts'

/**
 * What a Lesson leaves behind, written into the records file at its boundaries.
 *
 * **At Lesson boundaries, never per telemetry tick.** A file written twice a second by a
 * classroom of drones is being used as a log; this is a record. A Lesson opening writes the
 * room and the plan, a Lesson closing writes what happened.
 *
 * **No live readings, ever.** No altitude, no battery, no position. Coordinates appear on
 * `zone_point` and `checkpoint` only, because those are what a Teacher *set* rather than what
 * an airframe reported. The type below has nowhere to put a reading, which is the point: a
 * future hand cannot add one without changing this shape and reading this paragraph.
 */

export interface SeatRecord {
  readonly studentId: string
  readonly studentName: string
  readonly droneId: string | null
  readonly droneLabel: string | null
  readonly present: boolean
  readonly tookOffAt: string | null
  readonly landedAt: string | null
  /** Which points were reached, by checkpoint id, each with when Telemetry saw it. */
  readonly reached: readonly { readonly checkpointId: string; readonly at: string }[]
}

export interface ZoneRecord {
  readonly id: string
  readonly name: string
  readonly kind: string
  /** Corners in order. An ordinal is a column because a reordered zone is a different shape. */
  readonly points: readonly { readonly eastM: number; readonly northM: number }[]
}

export interface CheckpointRecord {
  readonly id: string
  readonly eastM: number
  readonly northM: number
}

export interface LessonSnapshot {
  readonly schoolName: string
  readonly className: string
  readonly teacherName: string
  readonly lessonId: string
  readonly lessonLabel: string
  readonly startedAt: string
  readonly endedAt: string | null
  /** True when the Lesson was made by the demonstration seed. Never a real class. */
  readonly demonstration: boolean
  readonly scenario: {
    readonly id: string
    readonly name: string
    readonly objective: string
    readonly limitMinutes: number
  } | null
  readonly missionId: string | null
  readonly missionStartedAt: string | null
  readonly missionSealedAt: string | null
  readonly drones: readonly { readonly id: string; readonly label: string }[]
  readonly teams: readonly {
    readonly id: string
    readonly name: string
    readonly studentIds: readonly string[]
    readonly droneId: string | null
  }[]
  readonly zones: readonly ZoneRecord[]
  readonly checkpoints: readonly CheckpointRecord[]
  readonly seats: readonly SeatRecord[]
}

/** Stable ids, so writing the same Lesson twice updates rather than duplicating. */
const idFor = (...parts: readonly string[]) => parts.join(':')

function upsert(db: DatabaseSync, sql: string, values: readonly unknown[]): void {
  db.prepare(sql).run(...(values as never[]))
}

/**
 * Write one Lesson into the records file.
 *
 * Idempotent by construction: every row is keyed on something derived from the Lesson, and
 * every insert is `or replace`. A Lesson sealed, reopened and sealed again leaves one record
 * rather than two, which is what a Teacher would expect and what a register has to do.
 *
 * One transaction. A power cut halfway through a class list must not leave half a Lesson.
 */
export function writeLesson(snapshot: LessonSnapshot, records?: RecordsDb): void {
  const open = records ?? openRecords()
  const { db } = open

  try {
    db.exec('begin')

    const schoolId = idFor('school', snapshot.schoolName)
    const classId = idFor('class', snapshot.schoolName, snapshot.className)
    const teacherId = idFor('teacher', snapshot.schoolName, snapshot.teacherName)

    upsert(db, 'insert or replace into school (id, name) values (?, ?)', [
      schoolId,
      snapshot.schoolName,
    ])
    upsert(db, 'insert or replace into class_group (id, school_id, name) values (?, ?, ?)', [
      classId,
      schoolId,
      snapshot.className,
    ])
    upsert(db, 'insert or replace into teacher (id, school_id, name) values (?, ?, ?)', [
      teacherId,
      schoolId,
      snapshot.teacherName,
    ])

    for (const drone of snapshot.drones) {
      upsert(db, 'insert or replace into drone (id, school_id, label, serial) values (?, ?, ?, ?)', [
        idFor('drone', snapshot.schoolName, drone.id),
        schoolId,
        drone.label,
        drone.id,
      ])
    }

    for (const seat of snapshot.seats) {
      upsert(db, 'insert or replace into student (id, class_id, name) values (?, ?, ?)', [
        idFor('student', classId, seat.studentId),
        classId,
        seat.studentName,
      ])
    }

    /*
     * A seeded Lesson is labelled a demonstration in the record itself, so nobody reading a
     * register next term has to work out which mornings were real.
     */
    const label = snapshot.demonstration
      ? `${snapshot.lessonLabel} (demonstration)`
      : snapshot.lessonLabel

    upsert(
      db,
      `insert or replace into lesson (id, class_id, teacher_id, label, started_at, ended_at)
       values (?, ?, ?, ?, ?, ?)`,
      [snapshot.lessonId, classId, teacherId, label, snapshot.startedAt, snapshot.endedAt],
    )

    if (snapshot.scenario && snapshot.missionId) {
      upsert(
        db,
        'insert or replace into scenario (id, name, objective, limit_minutes) values (?, ?, ?, ?)',
        [
          snapshot.scenario.id,
          snapshot.scenario.name,
          snapshot.scenario.objective,
          snapshot.scenario.limitMinutes,
        ],
      )
      upsert(
        db,
        `insert or replace into mission (id, lesson_id, scenario_id, started_at, sealed_at)
         values (?, ?, ?, ?, ?)`,
        [
          snapshot.missionId,
          snapshot.lessonId,
          snapshot.scenario.id,
          snapshot.missionStartedAt ?? snapshot.startedAt,
          snapshot.missionSealedAt,
        ],
      )

      for (const team of snapshot.teams) {
        upsert(db, 'insert or replace into team (id, mission_id, name) values (?, ?, ?)', [
          team.id,
          snapshot.missionId,
          team.name,
        ])
        for (const studentId of team.studentIds) {
          upsert(db, 'insert or replace into team_member (team_id, student_id) values (?, ?)', [
            team.id,
            idFor('student', classId, studentId),
          ])
        }
      }

      for (const zone of snapshot.zones) {
        upsert(db, 'insert or replace into zone (id, mission_id, kind, name) values (?, ?, ?, ?)', [
          zone.id,
          snapshot.missionId,
          zone.kind,
          zone.name,
        ])
        zone.points.forEach((point, ordinal) => {
          upsert(
            db,
            `insert or replace into zone_point (id, zone_id, ordinal, east_m, north_m)
             values (?, ?, ?, ?, ?)`,
            [idFor(zone.id, String(ordinal)), zone.id, ordinal, point.eastM, point.northM],
          )
        })
      }

      snapshot.checkpoints.forEach((checkpoint, ordinal) => {
        upsert(
          db,
          `insert or replace into checkpoint (id, mission_id, ordinal, east_m, north_m)
           values (?, ?, ?, ?, ?)`,
          [checkpoint.id, snapshot.missionId, ordinal, checkpoint.eastM, checkpoint.northM],
        )
      })

      for (const seat of snapshot.seats) {
        if (seat.droneId === null) continue
        const team = snapshot.teams.find((row) => row.droneId === seat.droneId)
        if (!team) continue
        const flightId = idFor('flight', snapshot.missionId, seat.studentId)
        upsert(
          db,
          `insert or replace into flight (id, mission_id, team_id, drone_id, took_off_at, landed_at)
           values (?, ?, ?, ?, ?, ?)`,
          [
            flightId,
            snapshot.missionId,
            team.id,
            idFor('drone', snapshot.schoolName, seat.droneId),
            seat.tookOffAt,
            seat.landedAt,
          ],
        )
        for (const reached of seat.reached) {
          upsert(
            db,
            `insert or replace into checkpoint_reached (flight_id, checkpoint_id, reached_at)
             values (?, ?, ?)`,
            [flightId, reached.checkpointId, reached.at],
          )
        }
      }
    }

    db.exec('commit')
  } catch (error) {
    db.exec('rollback')
    throw error
  } finally {
    if (!records) open.close()
  }
}
