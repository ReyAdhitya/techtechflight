import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { assignStudent, clearLogbook, readLogbook, runningLesson, startLesson } from '@/lib/logbook'
import { CLEARANCES_KEY } from '@/lib/clearance-store'
import {
  MISSION_DRAFT_KEY,
  chooseScenario,
  setMissionDrones,
  setMissionZones,
} from '@/lib/mission-draft'
import { PRE_FLIGHT_SEVEN_KEY, togglePropellersTick } from '@/lib/preflight-seven'
import { TEAMS_KEY, addStudentToTeam, assignDroneToTeam, createTeam, readTeams } from '@/lib/teams'
import {
  MISSION_BRIEFING_KEY,
  MISSION_BRIEFING_RULES,
  toggleMissionBriefRule,
} from './MissionBriefing'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import type { Zone } from '@/lib/airspace'
import { FleetProvider } from './FleetProvider'
import { MissionRunScreen } from './MissionRunScreen'

/**
 * One page, twelve steps, and the rail as the only navigation on it (ADR-0026).
 *
 * The assertions that matter most are the two the withdrawn rails failed. A locked step has
 * to say what is standing in the way, in the prototype's own words. And the live half has to
 * stay whole: Land, Hover, Recall and Stop live on the strips, and a Command a navigation
 * press can hide is a Command a Teacher cannot reach in the ten seconds they have.
 */

const query = vi.hoisted(() => ({ current: new URLSearchParams() }))
const replace = vi.hoisted(() => vi.fn())
/*
 * `/demo` rather than `/mission`, because `FleetProvider` runs the Fleet in the browser on
 * that path and waits for a ground station on every other. The deploy sets
 * `NEXT_PUBLIC_DEMO_ONLY`, which is the same switch by a different route.
 */
vi.mock('next/navigation', () => ({
  usePathname: () => '/demo',
  useSearchParams: () => query.current,
  useRouter: () => ({ push: vi.fn(), replace }),
}))

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
  for (const key of [
    MISSION_DRAFT_KEY,
    CLEARANCES_KEY,
    TEAMS_KEY,
    PRE_FLIGHT_SEVEN_KEY,
    MISSION_BRIEFING_KEY,
  ]) {
    window.localStorage.removeItem(key)
  }
}

/** Everything the set-up asks for, so the in-the-air steps are reachable. */
function classReadyToFly(): string {
  startLesson('Year 8, period 3', 6, 6, Date.now(), [])
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
  for (const rule of MISSION_BRIEFING_RULES) toggleMissionBriefRule(lessonId, rule.id)

  return lessonId
}

const missionRun = () =>
  render(
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>
      <MissionRunScreen />
    </FleetProvider>,
  )

const at = (step: number | null) => {
  query.current = new URLSearchParams(step === null ? '' : `step=${step}`)
}

/** The step surface alone. The rail names every step, so the page says most words twice. */
const surface = () => within(document.querySelector('main')!)

beforeEach(() => {
  at(null)
  replace.mockClear()
  clearLogbook()
  wipe()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  clearLogbook()
  wipe()
})

describe('the Mission run page', () => {
  it('carries the rail, and the rail is the navigation on it', () => {
    missionRun()
    settle()

    const rail = screen.getByRole('navigation', { name: /Mission steps/i })
    expect(rail).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Mission Scenario/i }).length).toBeGreaterThan(0)
  })

  it('opens on the step the records imply when the query says nothing', () => {
    missionRun()
    settle()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Choose the Mission Scenario' }),
    ).toBeInTheDocument()
    expect(surface().getByText('Step 1 of 12')).toBeInTheDocument()
    expect(surface().getByText('Set up')).toBeInTheDocument()
  })

  /* The prototype's own heading and reason, not a paraphrase of them. */
  it('says what the step is and why it exists, in the prototype words', () => {
    classReadyToFly()
    at(2)
    missionRun()
    settle()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Draw the Mission area and the No-fly Zones',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/stays true even when the origin is wrong/)).toBeInTheDocument()
  })

  it('shows one set-up block at a time', () => {
    classReadyToFly()
    at(1)
    missionRun()
    settle()

    expect(screen.getByRole('region', { name: 'Mission Scenario' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Mission area' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Mission teams' })).not.toBeInTheDocument()
  })

  /*
   * The one that is a safety property rather than a preference. Steps 6 to 10 are one board:
   * a Teacher reading an Alert at step 10 still has every strip, and every Land and Stop on
   * it, without pressing anything in the rail first.
   */
  it('keeps the whole live board on every in-the-air step', () => {
    classReadyToFly()

    for (const step of [6, 7, 8, 9, 10]) {
      at(step)
      const { unmount } = missionRun()
      settle()

      expect(
        surface().getByRole('heading', { name: /Awaiting clearance/i }),
        `step ${step} lost the clearance queue`,
      ).toBeInTheDocument()
      expect(
        surface().getByRole('heading', { name: 'Every Drone' }),
        `step ${step} lost the strips`,
      ).toBeInTheDocument()
      expect(
        surface().getByRole('heading', { level: 2, name: 'Where everything is' }),
        `step ${step} lost the Scope`,
      ).toBeInTheDocument()

      unmount()
    }
  })

  it('says what is standing in the way of a step that is not open', () => {
    at(6)
    missionRun()
    settle()

    // Nothing has been decided, so step 6 is not open and the page says so rather than
    // dropping the Teacher on a clearance queue that can never fill. The reason is the
    // step's own immediate one; the rail carries the rest of the chain.
    expect(screen.getByRole('status')).toHaveTextContent('Not open yet.')
    expect(screen.getByRole('status')).toHaveTextContent('Brief the class first')
  })

  /*
   * A step that is not open opens anyway and says why, rather than bouncing the Teacher
   * somewhere else. The first rail's defect was a link that appeared to work and did
   * nothing; a link that goes somewhere and explains itself is the opposite of that.
   */
  it('opens a step that is not ready and offers nothing it cannot do', () => {
    at(9)
    missionRun()
    settle()

    expect(
      screen.getByRole('heading', { level: 1, name: /What you can send/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Grant a takeoff first')
    expect(
      screen.queryByRole('link', { name: 'When something goes wrong' }),
    ).not.toBeInTheDocument()
  })

  it('will not open the debrief until the Mission is sealed', () => {
    classReadyToFly()
    at(12)
    missionRun()
    settle()

    expect(screen.getByRole('status')).toHaveTextContent('Seal the Mission first')
  })

  it('has exactly one main for the skip link to land on', () => {
    classReadyToFly()
    at(7)
    missionRun()
    settle()

    expect(document.querySelectorAll('main')).toHaveLength(1)
    expect(document.querySelectorAll('#content')).toHaveLength(1)
  })

  it('offers the next step as the one thing to press at the foot', () => {
    missionRun()
    settle()

    expect(screen.getByRole('link', { name: 'Draw the Mission area' })).toHaveAttribute(
      'href',
      '/mission?step=2',
    )
  })
})
