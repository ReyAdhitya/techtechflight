import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import {
  clearLogbook,
  missionsFrom,
  putMissionOnLesson,
  readLogbook,
  runningLesson,
  startLesson,
} from '@/lib/logbook'
import { emptyMission, type Mission, type MissionOutcome } from '@/lib/mission'
import { FleetProvider } from '@/components/FleetProvider'
import { ReportsScreen } from '@/components/ReportsScreen'

/**
 * A Mission a Teacher confirmed complete has to be readable afterwards.
 *
 * It was written to `techtechflight:mission-draft` alone, which is a working copy keyed by
 * Lesson and overwritten by the next period, and Reports only looked at closed Lessons. So
 * pressing Confirm mission complete and walking to Reports showed nothing at all: the
 * Mission was sealed, the Lesson was still running, and the score was unreadable.
 */

vi.mock('next/navigation', () => ({
  usePathname: () => '/reports',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const outcome: MissionOutcome = {
  endedAt: 9_000,
  criteria: {
    'tasks-completed': true,
    'safe-route': null,
    'no-collisions': true,
    'no-no-fly-violations': null,
    'procedures-followed': null,
  },
  failures: [],
  score: 0.5,
  debrief: null,
}

function sealed(id: string): Mission {
  return { ...emptyMission(id, 'search-rescue', 'Search and Rescue'), startedAt: 1_000, outcome }
}

beforeEach(() => clearLogbook())
afterEach(() => clearLogbook())

describe('a sealed Mission on a running Lesson', () => {
  it('is on the Lesson in the Logbook, not only in the side key', () => {
    startLesson('Year 8', 6, 6, 1_000, [])
    const lessonId = runningLesson(readLogbook())!.id

    putMissionOnLesson(lessonId, sealed('mission-1'))

    const lesson = readLogbook().lessons.find((entry) => entry.id === lessonId)!
    expect(missionsFrom(lesson).map((mission) => mission.id)).toEqual(['mission-1'])
    expect(missionsFrom(lesson)[0]?.outcome?.score).toBe(0.5)
  })

  it('replaces the same Mission rather than recording it twice', () => {
    startLesson('Year 8', 6, 6, 1_000, [])
    const lessonId = runningLesson(readLogbook())!.id

    putMissionOnLesson(lessonId, sealed('mission-1'))
    putMissionOnLesson(lessonId, sealed('mission-1'))

    const lesson = readLogbook().lessons.find((entry) => entry.id === lessonId)!
    expect(missionsFrom(lesson)).toHaveLength(1)
  })

  it('renders on Reports while the period is still going', () => {
    startLesson('Year 8', 6, 6, 1_000, [])
    const lessonId = runningLesson(readLogbook())!.id
    putMissionOnLesson(lessonId, sealed('mission-1'))

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ReportsScreen />
      </FleetProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Missions' })).toBeInTheDocument()
    expect(screen.getByText('This period is still going.')).toBeInTheDocument()
    // The score the Teacher confirmed, read back off the Lesson.
    const score = screen.getByText('Score').parentElement
    expect(score).toHaveTextContent('50')
  })
})
