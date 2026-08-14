import { afterEach, describe, expect, it } from 'vitest'
import type { DroneId } from '@techtechflight/contract'
import {
  propellersTicked,
  readPreFlightSeven,
  resetPreFlightSeven,
  tickAllPropellers,
  togglePropellersTick,
} from './preflight-seven.ts'
import {
  MISSION_BRIEFING_RULES,
  isMissionBriefingComplete,
  readMissionBriefing,
  resetMissionBriefing,
  tickAllMissionBriefRules,
} from '@/components/MissionBriefing'

/**
 * One tap for the whole bench, and one for the whole brief.
 *
 * Six of the seven pre-flight items read themselves from Telemetry; Propellers is the only
 * human tick, because the board cannot see a chipped blade. The tedium was never looking at a
 * propeller — it was doing that one tick once per aircraft, down a column of identical panels,
 * and again for eighteen rules a Teacher had just read aloud.
 */
const CRAFT: readonly DroneId[] = ['ttf-0001', 'ttf-0002', 'ttf-0003']

describe('ticking every propeller at once', () => {
  afterEach(() => resetPreFlightSeven('L-1'))

  it('ticks every craft in the Lesson', () => {
    const state = tickAllPropellers('L-1', CRAFT)

    expect(CRAFT.every((droneId) => propellersTicked(state, droneId))).toBe(true)
  })

  it('keeps the tick across a re-read, because the Lesson holds it', () => {
    tickAllPropellers('L-1', CRAFT)

    expect(propellersTicked(readPreFlightSeven('L-1'), 'ttf-0002')).toBe(true)
  })

  /* All or nothing. Pressing it twice must not unsay what a Teacher saw. */
  it('does not untick on a second press', () => {
    tickAllPropellers('L-1', CRAFT)
    const again = tickAllPropellers('L-1', CRAFT)

    expect(CRAFT.every((droneId) => propellersTicked(again, droneId))).toBe(true)
  })

  /* And the one blade that is wrong is still a tick away, per craft. */
  it('leaves the per craft tick able to take one back off', () => {
    tickAllPropellers('L-1', CRAFT)
    const after = togglePropellersTick('L-1', 'ttf-0002')

    expect(propellersTicked(after, 'ttf-0002')).toBe(false)
    expect(propellersTicked(after, 'ttf-0001')).toBe(true)
  })

  it('belongs to the Lesson it was ticked in', () => {
    tickAllPropellers('L-1', CRAFT)

    expect(propellersTicked(readPreFlightSeven('L-2'), 'ttf-0001')).toBe(false)
  })
})

describe('ticking every rule at once', () => {
  afterEach(() => resetMissionBriefing('L-1'))

  it('completes the brief in one press', () => {
    const state = tickAllMissionBriefRules('L-1')

    expect(isMissionBriefingComplete(state)).toBe(true)
    expect(MISSION_BRIEFING_RULES.every((rule) => state.checked[rule.id] === true)).toBe(true)
  })

  it('belongs to the Lesson it was ticked in', () => {
    tickAllMissionBriefRules('L-1')

    expect(isMissionBriefingComplete(readMissionBriefing('L-2'))).toBe(false)
  })
})
