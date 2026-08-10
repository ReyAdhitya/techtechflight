import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { assignStudent, clearLogbook, readLogbook, runningLesson, startLesson } from '@/lib/logbook'
import { CLEARANCES_KEY } from '@/lib/clearance-store'
import {
  MISSION_DRAFT_KEY,
  chooseScenario,
  setMissionDrones,
  setMissionZones,
  startMission,
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
  kind: 'no-fly',
  name: 'Over the desks',
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
        name: 'Draw the No-fly Zones',
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
   * The safety property, restated for ADR-0030.
   *
   * Steps 6 to 10 used to be one board, so that no Command could be behind a navigation
   * press. They are one panel each now, and the argument is answered rather than dropped:
   * the Attention bar and the fleet-wide Land all / Hover all / Stop all are above every one
   * of them, so a Teacher can bring every aircraft down from anywhere in one tap.
   */
  it('keeps Attention and the fleet-wide stop above every in-the-air step', () => {
    classReadyToFly()

    for (const step of [6, 7, 8, 9, 10]) {
      at(step)
      const { unmount } = missionRun()
      settle()

      expect(
        surface().getByRole('region', { name: 'Attention' }),
        `step ${step} lost the Attention bar`,
      ).toBeInTheDocument()
      expect(
        surface().getByRole('region', { name: 'Fleet actions' }),
        `step ${step} lost the fleet-wide buttons`,
      ).toBeInTheDocument()

      unmount()
    }
  }, 20_000)

  /*
   * And each step shows only its own panel, in the rail's order.
   *
   * The page used to run 10, 6, 9, 7 down one scroller, so tapping step 7 scrolled past 9 and
   * 10 to reach it and tapping 9 went backwards. The numbers counted up and the page did not.
   */
  it('shows one panel per step, and only that step', () => {
    const lessonId = classReadyToFly()
    startMission(lessonId, Date.now())

    const panels: Readonly<Record<number, string>> = {
      6: 'Awaiting clearance',
      7: 'Where everything is',
      8: 'Every Drone',
      9: 'Teacher actions',
    }

    for (const [step, heading] of Object.entries(panels)) {
      at(Number(step))
      const { unmount } = missionRun()
      settle()

      expect(
        surface().getByRole('heading', { level: 2, name: heading }),
        `step ${step} did not show its own panel`,
      ).toBeInTheDocument()

      for (const [other, otherHeading] of Object.entries(panels)) {
        if (other === step) continue
        expect(
          surface().queryByRole('heading', { level: 2, name: otherHeading }),
          `step ${step} is also showing step ${other}`,
        ).not.toBeInTheDocument()
      }

      unmount()
    }
  }, 20_000)

  /*
   * Step 8's own words, and the reason they were unreachable.
   *
   * `MissionRunScreen` handed the rail a hardcoded `selectedCraftName: null`, so step 8 could
   * only ever read "No Drone selected" however many Drones a Teacher picked, and the unit
   * test asserting a name was asserting a state the app could not produce. The selection
   * lives on the live board; this checks it arrives at the rail.
   */
  it('names the Drone the Teacher picked against step 8', () => {
    const lessonId = classReadyToFly()
    // Under way, or steps 7 to 10 are locked and there is no board to pick a Drone on.
    startMission(lessonId, Date.now())
    /*
     * Picked on the Scope at step 7, which is where a Drone is chosen now that the strips
     * live on step 8 (ADR-0030). It has to be a step other than 8: the rail row a Teacher is
     * standing on reads "You are here" rather than its own words, so step 8 can only ever say
     * which Drone it is about while somebody is looking at it from somewhere else. That is
     * the whole point of the sentence.
     */
    at(7)
    missionRun()
    settle()

    const step8 = () => screen.getByRole('link', { name: /Telemetry and camera/ })
    expect(step8()).toHaveAttribute('title', '8. Telemetry and camera, No Drone selected')

    const mark = surface().getAllByRole('button', { pressed: false })
      .find((button) => (button.textContent ?? '').includes('Drone 1'))!
    act(() => {
      fireEvent.click(mark)
    })
    settle()

    expect(step8()).toHaveAttribute('title', '8. Telemetry and camera, Drone 1 selected')
  }, 20_000)

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

  /*
   * The one step where hiding the strips is safe rather than reckless: step 11 does not
   * open until every craft is down, so there is no Command left to send.
   */
  it('gives close-down a surface of its own, without the live board under it', () => {
    const lessonId = classReadyToFly()
    // Opening the flying board is what starts a Mission, and step 11 needs one under way.
    startMission(lessonId, Date.now())
    at(11)
    missionRun()
    settle()

    expect(surface().getByRole('heading', { name: 'Mission complete' })).toBeInTheDocument()
    expect(surface().getByRole('heading', { name: 'Pack-down' })).toBeInTheDocument()
    expect(surface().queryByRole('heading', { name: 'Every Drone' })).not.toBeInTheDocument()
    expect(
      surface().queryByRole('heading', { name: /Awaiting clearance/i }),
    ).not.toBeInTheDocument()
  })

  /*
   * The dead end. Step 11 used to close while anything was airborne, so `StepSurface` never
   * mounted and a Teacher got a lock note with nothing to press. ADR-0026 says the refusal is
   * the step, so the step opens and the button is what refuses.
   */
  it('opens step 11 with a craft still up, and refuses on the button rather than the step', () => {
    const lessonId = classReadyToFly()
    startMission(lessonId, Date.now())
    at(11)
    missionRun()
    settle()

    expect(surface().getByRole('heading', { name: 'Mission complete' })).toBeInTheDocument()
    expect(
      surface().getByRole('button', { name: /Confirm mission complete/i }),
    ).toBeInTheDocument()
    // Not the lock note: the step is open, and the way out of the refusal is on it.
    expect(surface().queryByText(/Not open yet/)).not.toBeInTheDocument()
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

    expect(screen.getByRole('link', { name: 'Draw the No-fly Zones' })).toHaveAttribute(
      'href',
      '/mission?step=2',
    )
  })
})


const CSS = readFileSync(resolve(process.cwd(), 'web/app/globals.css'), 'utf8')

/** The declarations of one rule, by selector, from the single stylesheet. */
function rule(selector: string): string {
  const at = CSS.indexOf(`${selector} {`)
  expect(at, `${selector} is not in globals.css`).toBeGreaterThan(-1)
  return CSS.slice(at, CSS.indexOf('}', at))
}

/**
 * How the page is laid out, read from the stylesheet.
 *
 * jsdom has no layout engine, so a rail that has left the flow and covers the whole board,
 * a surface with no gutter, and a Steps button visible on a desk are all invisible here and
 * obvious on a screen. These are the invariants a deleted rule would break silently.
 */
describe('the shape of the Mission run page', () => {
  it('keeps the rail beside the surface and sticky, rather than scrolling it away', () => {
    const rail = rule('.step-rail')
    expect(rail).toMatch(/position:\s*sticky/)
    expect(rail).toMatch(/flex:\s*0 0 auto/)
    expect(rule('.mission-run__surface')).toMatch(/padding-inline-start:\s*1\.25rem/)
  })

  /*
   * Under 60rem the rail becomes a drawer, so the gutter it was holding open has to go and
   * the two ways in and out of it have to appear. All three live in one media block.
   */
  it('turns the rail into a drawer on a narrow screen, with a way in and a way out', () => {
    const at = CSS.indexOf('@media (max-width: 60rem)', CSS.indexOf('.step-rail {'))
    expect(at, 'the rail has no narrow-screen behaviour').toBeGreaterThan(-1)
    const narrow = CSS.slice(at, at + 1200)

    expect(narrow).toMatch(/\.mission-run__surface\s*\{[^}]*padding-inline-start:\s*0/s)
    expect(narrow).toMatch(/\.mission-run__steps,\s*\.mission-run__scrim\s*\{[^}]*display:\s*flex/s)
  })

  /* On a board the rail is always there, so a button that opens it would say nothing. */
  it('hides the Steps button and the scrim on a board', () => {
    expect(rule('.mission-run__steps')).toMatch(/display:\s*none/)
    expect(rule('.mission-run__scrim')).toMatch(/display:\s*none/)
  })

  /* One raw colour in a component rule is how a second dark gets into a design system. */
  it('dims the board behind the drawer with a token, not a literal', () => {
    expect(rule('.mission-run__scrim')).toMatch(/background:\s*var\(--scrim\)/)
    expect(CSS).toMatch(/--scrim:\s*rgb\(27 22 16 \/ 0\.45\)/)
  })
})
