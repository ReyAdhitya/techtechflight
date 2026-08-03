import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearLogbook,
  readLogbook,
  recordCommand,
  runningLesson,
  startLesson,
} from '@/lib/logbook'
import { STOP_COMMAND_KIND, recordStopOnLesson, stopsOnLesson } from './stop-audit'

describe('stop audit on the lesson', () => {
  beforeEach(() => {
    clearLogbook()
  })

  it('writes every Stop onto the lesson record with time and craft', () => {
    const id = startLesson('Year 8', 5, 6, 1_000)

    recordStopOnLesson(id, {
      at: 2_500,
      droneId: 'ttf-0001',
      droneName: 'Drone 1',
    })
    recordStopOnLesson(id, {
      at: 4_000,
      droneId: 'ttf-0003',
      droneName: 'Drone 3',
    })

    const lesson = runningLesson(readLogbook())!
    expect(lesson.commands).toEqual([
      {
        at: 2_500,
        droneId: 'ttf-0001',
        droneName: 'Drone 1',
        kind: STOP_COMMAND_KIND,
      },
      {
        at: 4_000,
        droneId: 'ttf-0003',
        droneName: 'Drone 3',
        kind: STOP_COMMAND_KIND,
      },
    ])
    expect(stopsOnLesson(lesson)).toEqual([
      { at: 2_500, droneId: 'ttf-0001', droneName: 'Drone 1' },
      { at: 4_000, droneId: 'ttf-0003', droneName: 'Drone 3' },
    ])
  })

  it('reads only Stop presses, not Land or Hover', () => {
    const id = startLesson('Year 8', 5, 6, 1_000)
    recordCommand(id, {
      at: 1_500,
      droneId: 'ttf-0001',
      droneName: 'Drone 1',
      kind: 'land',
    })
    recordStopOnLesson(id, {
      at: 2_000,
      droneId: 'ttf-0002',
      droneName: 'Drone 2',
    })
    recordCommand(id, {
      at: 2_500,
      droneId: 'ttf-0001',
      droneName: 'Drone 1',
      kind: 'hold',
    })

    const lesson = runningLesson(readLogbook())!
    expect(stopsOnLesson(lesson)).toEqual([
      { at: 2_000, droneId: 'ttf-0002', droneName: 'Drone 2' },
    ])
  })

  it('returns none when the lesson has no commands yet', () => {
    const id = startLesson('Year 8', 5, 6, 1_000)
    const lesson = runningLesson(readLogbook())!
    expect(lesson.id).toBe(id)
    expect(stopsOnLesson(lesson)).toEqual([])
  })
})
