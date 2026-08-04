import { beforeEach, describe, expect, it } from 'vitest'
import { AcknowledgementTracker } from './acknowledgement'
import {
  alertLogForLesson,
  ALERT_LOG_KEY,
  clearAlertLog,
  observeAlertLog,
  readAlertLog,
  recordAlertTeacherAction,
  writeAlertLog,
} from './alert-log'
import type { DroneVitals } from './vitals'

const aDrone = (
  droneId: string,
  alerts: DroneVitals['alerts'],
  callsign = droneId,
): DroneVitals => ({
  droneId,
  callsign,
  status: 'Flying',
  phase: 'level',
  airborne: true,
  altitudeM: 1,
  verticalRateMps: 0,
  groundSpeedMps: null,
  batteryFraction: 0.5,
  enduranceMs: null,
  responseAgeMs: 500,
  position: { eastM: 0, northM: 0 },
  separationM: null,
  conflictWith: null,
  alerts,
})

beforeEach(() => {
  clearAlertLog()
})

describe('observeAlertLog', () => {
  it('persists raised-at, kind, craft and text on the Lesson', () => {
    const state = observeAlertLog(
      readAlertLog('lesson-1'),
      [
        aDrone('ttf-0001', [
          {
            kind: 'obstacle',
            severity: 'warning',
            text: 'Move away from the obstacle.',
            since: 1_000,
          },
        ]),
      ],
      2_000,
    )
    writeAlertLog(state)

    const stored = alertLogForLesson('lesson-1')
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      droneId: 'ttf-0001',
      droneName: 'ttf-0001',
      kind: 'obstacle',
      raisedAt: 1_000,
      clearedAt: null,
      text: 'Move away from the obstacle.',
      teacherAction: null,
    })
    expect(window.localStorage.getItem(ALERT_LOG_KEY)).toContain('obstacle')
  })

  it('sets cleared-at when the condition ends', () => {
    let state = observeAlertLog(
      readAlertLog('lesson-1'),
      [aDrone('ttf-0001', [{ kind: 'separation', severity: 'warning', text: 'Back off.', since: 1_000 }])],
      1_500,
    )
    state = observeAlertLog(state, [aDrone('ttf-0001', [])], 3_000)
    writeAlertLog(state)

    expect(alertLogForLesson('lesson-1')[0]?.clearedAt).toBe(3_000)
  })
})

describe('recordAlertTeacherAction', () => {
  it('persists what the Teacher did on the Lesson row', () => {
    let state = observeAlertLog(
      readAlertLog('lesson-1'),
      [aDrone('ttf-0001', [{ kind: 'low-endurance', severity: 'warning', text: 'Land soon.', since: 1_000 }])],
      1_500,
    )
    state = recordAlertTeacherAction(state, 'ttf-0001', 'low-endurance', 'Told the team to land now')

    expect(state.records[0]?.teacherAction).toBe('Told the team to land now')
    expect(alertLogForLesson('lesson-1')[0]?.teacherAction).toBe('Told the team to land now')
  })
})

describe('acknowledgement stays in memory', () => {
  it('does not write acknowledgement into the alert log', () => {
    const tracker = new AcknowledgementTracker()
    const fleet = [aDrone('ttf-0001', [{ kind: 'obstacle', severity: 'warning', text: 'Move.', since: 1_000 }])]

    tracker.acknowledge('ttf-0001', fleet[0]!.alerts[0]!, 2_000)
    writeAlertLog(observeAlertLog(readAlertLog('lesson-1'), fleet, 2_000))

    expect(tracker.size).toBe(1)
    expect(alertLogForLesson('lesson-1')[0]).not.toHaveProperty('acknowledgedAt')
    expect(alertLogForLesson('lesson-1')[0]?.teacherAction).toBeNull()
  })
})
