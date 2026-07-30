import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  clearLogbook,
  dismissRemedial,
  enqueueRemedial,
  readLogbook,
  remedialQueueOf,
} from '@/lib/logbook'
import { remedialCandidatesFromLesson } from '@/lib/remedial-queue'
import { RemedialQueue } from './RemedialQueue'

describe('remedialCandidatesFromLesson', () => {
  it('collects fault incidents once per Drone', () => {
    const lesson = {
      id: 'lesson-1',
      label: 'Test',
      startedAt: 0,
      endedAt: 1000,
      readyAtStart: 6,
      fleetSize: 6,
      incidents: [
        {
          at: 100,
          text: 'IMU fault',
          severity: 'fault' as const,
          droneId: 'ttf-0001',
          droneName: 'Drone 1',
        },
        {
          at: 200,
          text: 'Still faulting',
          severity: 'fault' as const,
          droneId: 'ttf-0001',
          droneName: 'Drone 1',
        },
        {
          at: 300,
          text: 'Low charge',
          severity: 'attention' as const,
          droneId: 'ttf-0002',
          droneName: 'Drone 2',
        },
      ],
    }
    const entries = remedialCandidatesFromLesson(lesson, readLogbook())
    expect(entries).toHaveLength(1)
    expect(entries[0]?.droneId).toBe('ttf-0001')
    expect(entries[0]?.reason).toBe('IMU fault')
  })
})

describe('RemedialQueue', () => {
  beforeEach(() => {
    clearLogbook()
  })

  it('links each row to Drone detail and dismisses on Done', () => {
    enqueueRemedial({
      droneId: 'ttf-0003',
      droneName: 'Drone 3',
      studentName: 'Priya',
      reason: 'Fault during landing',
      addedAt: 1,
    })
    render(<RemedialQueue queue={remedialQueueOf(readLogbook())} />)
    expect(screen.getByRole('link', { name: 'Priya' })).toHaveAttribute(
      'href',
      '/drone?id=ttf-0003',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(readLogbook().remedialQueue).toEqual([])
  })

  it('renders nothing when the queue is empty', () => {
    const { container } = render(<RemedialQueue queue={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('dismissRemedial', () => {
  beforeEach(() => clearLogbook())

  it('removes one Drone and leaves the rest', () => {
    enqueueRemedial({
      droneId: 'a',
      droneName: 'A',
      reason: 'One',
      addedAt: 1,
    })
    enqueueRemedial({
      droneId: 'b',
      droneName: 'B',
      reason: 'Two',
      addedAt: 2,
    })
    dismissRemedial('a')
    expect(readLogbook().remedialQueue?.map((e) => e.droneId)).toEqual(['b'])
  })
})
