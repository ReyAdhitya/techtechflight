import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { assignStudent, clearLogbook, startLesson, runningLesson, readLogbook } from '@/lib/logbook'
import { CLEARANCES_KEY, readClearances } from '@/lib/clearance-store'
import {
  MISSION_DRAFT_KEY,
  chooseScenario,
  readMission,
  setMissionDrones,
  setMissionZones,
} from '@/lib/mission-draft'
import { PRE_FLIGHT_SEVEN_KEY, togglePropellersTick } from '@/lib/preflight-seven'
import { TEAMS_KEY, addStudentToTeam, assignDroneToTeam, createTeam, readTeams } from '@/lib/teams'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import type { Zone } from '@/lib/airspace'
import { resetClassroomForTests } from '@/lib/classroom-session'
import { SimulatedTelemetrySource } from '@techtechflight/fleet-core/simulator'
import { ControlScreen } from './ControlScreen'
import { ClassroomOpen } from './ClassroomOpen'
import { FleetProvider } from './FleetProvider'

const desks: Zone = {
  id: 'desks',
  kind: 'no-fly',
  name: 'Over the desks',
  points: [
    { eastM: -3.5, northM: -1 },
    { eastM: -1.5, northM: -1 },
    { eastM: -1.5, northM: 1 },
    { eastM: -3.5, northM: 1 },
  ],
}

const onTheGrid: Zone = {
  id: 'on-the-grid',
  kind: 'no-fly',
  name: 'On the grid',
  points: [
    { eastM: -1, northM: -1 },
    { eastM: 1, northM: -1 },
    { eastM: 1, northM: 1 },
    { eastM: -1, northM: 1 },
  ],
}

/**
 * Clearance and Mission seal on the always-on Control board (no step rail).
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useSearchParams: () => new URLSearchParams(),
}))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

const triangle: Zone = {
  id: 'zone-1',
  kind: 'no-fly',
  name: 'Over the desks',
  points: [
    { eastM: 0, northM: 0 },
    { eastM: 20, northM: 0 },
    { eastM: 20, northM: 20 },
  ],
}

const wipe = () => {
  for (const key of [MISSION_DRAFT_KEY, CLEARANCES_KEY, TEAMS_KEY, PRE_FLIGHT_SEVEN_KEY]) {
    window.localStorage.removeItem(key)
  }
  resetClassroomForTests()
}

function classReadyToFly(zones: readonly Zone[] = [triangle]): string {
  startLesson('Year 8', 6, 6, Date.now(), [])
  const lessonId = runningLesson(readLogbook())!.id

  assignStudent('ttf-0001', 'Priya')
  createTeam('Red Team')
  const teamId = readTeams()[0]!.id
  assignDroneToTeam(teamId, 'ttf-0001')
  const studentId = readLogbook().students['ttf-0001']
  if (typeof studentId === 'string') addStudentToTeam(teamId, studentId)

  chooseScenario(lessonId, 'search-rescue')
  if (zones.length > 0) setMissionZones(lessonId, zones)
  setMissionDrones(lessonId, ['ttf-0001'])
  togglePropellersTick(lessonId, 'ttf-0001')

  return lessonId
}

const control = () =>
  render(
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>
      <ControlScreen />
    </FleetProvider>,
  )

beforeEach(() => {
  pathname.current = '/demo'
  clearLogbook()
  wipe()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  clearLogbook()
  wipe()
})

describe('approving takeoff on the live board', () => {
  it('is not on the board at all until there is a Mission to clear', () => {
    control()
    settle()

    expect(screen.queryByRole('heading', { name: /Awaiting clearance/i })).not.toBeInTheDocument()
  })

  it('mounts the clearance queue once a Mission exists', () => {
    classReadyToFly()
    control()
    settle()

    expect(screen.getByRole('heading', { name: /Awaiting clearance/i })).toBeInTheDocument()
  })

  it('keeps the queue on screen when nobody is waiting', () => {
    startLesson('Year 8', 6, 6, Date.now(), [])
    const lessonId = runningLesson(readLogbook())!.id
    chooseScenario(lessonId, 'search-rescue')

    control()
    settle()

    expect(screen.getByText(/Nobody is awaiting clearance/i)).toBeInTheDocument()
  })

  it('writes a granted clearance down', () => {
    const lessonId = classReadyToFly()
    control()
    settle()

    const grant = screen.queryByRole('button', { name: /Grant takeoff/i })
    expect(grant, 'nobody reached the queue').not.toBeNull()

    fireEvent.click(grant!)

    expect(readClearances(lessonId).records.some((r) => r.grantedAt !== null)).toBe(true)
  })

  it('hands flyRoute the Search and Rescue points, not an empty list', () => {
    const flyRoute = vi.spyOn(SimulatedTelemetrySource.prototype, 'flyRoute')
    const lessonId = classReadyToFly()
    const points = readMission(lessonId)!.checkpoints.map((point) => point.at)
    expect(points.length).toBeGreaterThan(0)

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ClassroomOpen />
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const grant = screen.queryByRole('button', { name: /Grant takeoff/i })
    expect(grant, 'nobody reached the queue').not.toBeNull()
    fireEvent.click(grant!)

    expect(flyRoute).toHaveBeenCalled()
    const waypoints = flyRoute.mock.calls[0]?.[1]
    expect(waypoints).toEqual(points)
    flyRoute.mockRestore()
  })

  it('treats opening Control as the Mission being under way', () => {
    const lessonId = classReadyToFly()
    expect(readMission(lessonId)?.startedAt).toBeNull()

    control()
    settle()

    expect(readMission(lessonId)?.startedAt).not.toBeNull()
  })
})

describe('confirming the Mission complete', () => {
  it('stays off the board when there is no Mission to confirm', () => {
    control()
    settle()

    expect(
      screen.queryByRole('button', { name: /Confirm mission complete/i }),
    ).not.toBeInTheDocument()
  })

  it('is on the board once a Mission is under way, and does not seal it by itself', () => {
    const lessonId = classReadyToFly()
    control()
    settle()

    expect(
      screen.getByRole('button', { name: /Confirm mission complete/i }),
    ).toBeInTheDocument()
    expect(readMission(lessonId)?.outcome ?? null).toBeNull()
  })

  it('carries pack-down under the confirmation', () => {
    classReadyToFly()
    control()
    settle()

    expect(screen.getAllByRole('heading', { name: 'Pack-down' })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Craft returned' })).toBeInTheDocument()
  })
})

describe('the live Control board', () => {
  it('has no Mission step rail', () => {
    control()
    settle()

    expect(screen.queryByRole('navigation', { name: /Mission steps/i })).not.toBeInTheDocument()
  })

  it('shows the Teacher ATC toolbar', () => {
    classReadyToFly()
    control()
    settle()

    expect(screen.getByRole('region', { name: /Teacher ATC actions/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve takeoff' })).toBeInTheDocument()
  })
})

/**
 * A zone drawn on step 2 must hatch on step 7, or be named as outside this picture.
 *
 * QA 2026-08-21: rail said 1 no-fly; Top-down had no hatch and no leftover sentence. The
 * drawing surface and the Scope were not the same metres, and Control held a Mission from
 * mount that never saw the zone. jsdom will not catch a missing hatch on a photograph;
 * it will catch the zone never reaching the SVG.
 */
describe('a No-fly Zone on step 7', () => {
  const step7 = () =>
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen step={7} />
      </FleetProvider>,
    )

  it('hatches a zone drawn in the west of the classroom', () => {
    classReadyToFly([desks])
    step7()
    settle()

    const hatch = document.querySelector('[data-zone-kind="no-fly"]')
    expect(hatch).toBeInTheDocument()
    const easts = (hatch?.getAttribute('points') ?? '')
      .split(' ')
      .map((pair) => Number(pair.split(',')[0]))
      .filter((value) => Number.isFinite(value))
    expect(Math.max(...easts) - Math.min(...easts)).toBeGreaterThan(0)
    expect(screen.queryByText(/outside this picture/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Side' }))
    expect(document.querySelector('[data-zone-kind="no-fly"][data-zone-hatched]')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Front' }))
    expect(document.querySelector('[data-zone-kind="no-fly"][data-zone-hatched]')).toBeInTheDocument()
  })

  it('shows a zone drawn after the flying board has already mounted', () => {
    const lessonId = classReadyToFly([])
    step7()
    settle()

    expect(document.querySelector('[data-zone-kind="no-fly"]')).not.toBeInTheDocument()

    act(() => {
      setMissionZones(lessonId, [onTheGrid])
    })

    expect(document.querySelector('[data-zone-kind="no-fly"]')).toBeInTheDocument()
  })
})
