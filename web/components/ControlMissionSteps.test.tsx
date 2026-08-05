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
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'

/**
 * Steps 6 and 11 of the Mission run, which existed as code and as tests and were never
 * mounted on a screen.
 *
 * `ClearanceQueue` and `ConfirmMissionComplete` both shipped with their own passing tests
 * and neither was imported by anything a Teacher could open, so approving a takeoff and
 * sealing a Mission were unreachable in the product. These assertions are about the wiring
 * rather than the components: that Control renders them, and that granting a clearance
 * survives being written down.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

const triangle: Zone = {
  id: 'zone-1',
  kind: 'mission',
  name: 'Mission Zone',
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
}

/** A Lesson with a Mission on it, one team, one craft, propellers ticked. */
function classReadyToFly(): string {
  startLesson('Year 8', 6, 6, Date.now(), [])
  const lessonId = runningLesson(readLogbook())!.id

  assignStudent('ttf-0001', 'Priya')
  createTeam('Red Team')
  const teamId = readTeams()[0]!.id
  assignDroneToTeam(teamId, 'ttf-0001')
  const studentId = readLogbook().students['ttf-0001']
  if (typeof studentId === 'string') addStudentToTeam(teamId, studentId)

  chooseScenario(lessonId, 'search-rescue')
  setMissionZones(lessonId, [triangle])
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

describe('step 6, approving takeoff', () => {
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

  /*
   * The count stays visible at zero. A queue that vanishes when nobody is waiting reads as
   * a layout bug rather than as information (DELIBERATE-POSITIONS 3).
   */
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

    const grant = screen.queryByRole('button', { name: /Grant clearance/i })
    expect(grant, 'nobody reached the queue').not.toBeNull()

    fireEvent.click(grant!)

    expect(readClearances(lessonId).records.some((r) => r.grantedAt !== null)).toBe(true)
  })

  it('treats opening Control as the Mission being under way', () => {
    const lessonId = classReadyToFly()
    expect(readMission(lessonId)?.startedAt).toBeNull()

    control()
    settle()

    // The queue fills itself from eligibility, and eligibility needs an active Mission.
    expect(readMission(lessonId)?.startedAt).not.toBeNull()
  })
})

describe('step 11, confirming the Mission complete', () => {
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
})

describe('the rail on Control', () => {
  it('is there, so a Teacher does not lose their place crossing screens', () => {
    control()
    settle()

    expect(screen.getByRole('navigation', { name: /Mission steps/i })).toBeInTheDocument()
  })
})
