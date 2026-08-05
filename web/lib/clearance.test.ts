import { describe, expect, it } from 'vitest'
import type { Status } from '@techtechflight/contract'
import {
  awaitingClearance,
  clearedForDrone,
  emptyClearanceState,
  endClearancesForMission,
  grantClearance,
  isCleared,
  shouldAwaitClearance,
  syncClearanceQueue,
  type ClearanceCraftInput,
  type ClearanceState,
} from './clearance.ts'
import { emptyMission, type Mission } from './mission.ts'

/**
 * Clearances are Teacher records (ADR-0021). These pin the derived queue, the grant audit
 * trail, and the rule that a clearance dies with its Mission.
 */

const mission = (overrides: Partial<Mission> = {}): Mission => ({
  ...emptyMission('m1', 'search-rescue', 'Search and Rescue'),
  startedAt: 1_000,
  droneIds: ['ttf-0001'],
  ...overrides,
})

const craft = (overrides: Partial<ClearanceCraftInput> = {}): ClearanceCraftInput => ({
  droneId: 'ttf-0001',
  status: 'Ready',
  studentId: 'stu-ada',
  preFlightDone: true,
  mission: mission(),
  ...overrides,
})

describe('who enters the queue', () => {
  it('queues itself once Ready, assigned and past pre-flight', () => {
    const state = emptyClearanceState()
    expect(shouldAwaitClearance(craft(), state)).toBe(true)

    const synced = syncClearanceQueue(state, [craft()], 2_000)
    expect(awaitingClearance([craft()], synced)).toEqual([
      {
        droneId: 'ttf-0001',
        missionId: 'm1',
        requestedAt: 2_000,
        grantedAt: null,
        grantedBy: null,
        endedAt: null,
      },
    ])
  })

  it('stays out when not Ready', () => {
    const state = emptyClearanceState()
    for (const status of ['Offline', 'Not Ready', 'Flying', 'Fault'] as const satisfies readonly Status[]) {
      expect(shouldAwaitClearance(craft({ status }), state)).toBe(false)
    }
    expect(awaitingClearance([craft({ status: 'Not Ready' })], state)).toEqual([])
  })

  it('stays out when nobody is assigned', () => {
    const state = emptyClearanceState()
    expect(shouldAwaitClearance(craft({ studentId: null }), state)).toBe(false)
    expect(shouldAwaitClearance(craft({ studentId: '   ' }), state)).toBe(false)
  })

  it('stays out until the pre-flight check is done', () => {
    const state = emptyClearanceState()
    expect(shouldAwaitClearance(craft({ preFlightDone: false }), state)).toBe(false)
  })

  it('stays out with no Mission or an inactive one', () => {
    const state = emptyClearanceState()
    expect(shouldAwaitClearance(craft({ mission: null }), state)).toBe(false)
    expect(
      shouldAwaitClearance(craft({ mission: mission({ startedAt: null }) }), state),
    ).toBe(false)
    expect(
      shouldAwaitClearance(
        craft({
          mission: mission({
            outcome: {
              endedAt: 9_000,
              criteria: {
                'tasks-completed': true,
                'safe-route': null,
                'no-collisions': null,
                'no-no-fly-violations': null,
                'procedures-followed': null,
              },
              failures: [],
              score: 0.8,
              debrief: null,
            },
          }),
        }),
        state,
      ),
    ).toBe(false)
  })

  it('stays out when the craft is not on the Mission', () => {
    const state = emptyClearanceState()
    expect(
      shouldAwaitClearance(craft({ mission: mission({ droneIds: ['ttf-0002'] }) }), state),
    ).toBe(false)
  })
})

describe('granting clearance', () => {
  it('records who granted and when', () => {
    let state = syncClearanceQueue(emptyClearanceState(), [craft()], 2_000)
    state = grantClearance(state, 'ttf-0001', 'm1', 'Ms Chen', 3_000)

    const record = state.records[0]!
    expect(record.grantedAt).toBe(3_000)
    expect(record.grantedBy).toBe('Ms Chen')
    expect(isCleared(state, 'ttf-0001', 'm1')).toBe(true)
    expect(clearedForDrone(state, 'ttf-0001', mission())).toBe(true)
  })

  it('does not re-queue a craft that is already cleared', () => {
    let state = syncClearanceQueue(emptyClearanceState(), [craft()], 2_000)
    state = grantClearance(state, 'ttf-0001', 'm1', 'Ms Chen', 3_000)

    expect(shouldAwaitClearance(craft(), state)).toBe(false)
    expect(awaitingClearance([craft()], state)).toEqual([])
  })
})

describe('when the Mission ends', () => {
  it('ends every clearance for that Mission', () => {
    let state = syncClearanceQueue(emptyClearanceState(), [craft()], 2_000)
    state = grantClearance(state, 'ttf-0001', 'm1', 'Ms Chen', 3_000)
    state = endClearancesForMission(state, 'm1', 9_000)

    expect(state.records[0]!.endedAt).toBe(9_000)
    expect(isCleared(state, 'ttf-0001', 'm1')).toBe(false)
    expect(clearedForDrone(state, 'ttf-0001', mission())).toBe(false)
  })

  it('leaves clearances for other Missions alone', () => {
    const other = mission({ id: 'm2', droneIds: ['ttf-0002'] })
    let state: ClearanceState = {
      records: [
        {
          droneId: 'ttf-0001',
          missionId: 'm1',
          requestedAt: 1_000,
          grantedAt: 2_000,
          grantedBy: 'Ms Chen',
          endedAt: null,
        },
        {
          droneId: 'ttf-0002',
          missionId: 'm2',
          requestedAt: 1_000,
          grantedAt: 2_000,
          grantedBy: 'Ms Chen',
          endedAt: null,
        },
      ],
    }

    state = endClearancesForMission(state, 'm1', 9_000)

    expect(state.records.find((row) => row.missionId === 'm1')!.endedAt).toBe(9_000)
    expect(state.records.find((row) => row.missionId === 'm2')!.endedAt).toBeNull()
    expect(isCleared(state, 'ttf-0002', 'm2')).toBe(true)
  })
})
