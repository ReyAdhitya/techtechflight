import { describe, expect, it } from 'vitest'
import {
  batteryOnChargeSummary,
  emptyBatteryOnCharge,
  ensureBatteryOnChargeLesson,
  isBatteryOnCharge,
  setBatteryOnCharge,
  toggleBatteryOnCharge,
  type BatteryPackRef,
} from './battery-oncharge'

const packs: readonly BatteryPackRef[] = [
  { droneId: 'ttf-0001', droneName: 'Drone 1' },
  { droneId: 'ttf-0002', droneName: 'Drone 2' },
  { droneId: 'ttf-0003', droneName: 'Drone 3' },
]

describe('battery back on charge', () => {
  it('starts with nothing on charge', () => {
    const state = emptyBatteryOnCharge('lesson-1')
    expect(batteryOnChargeSummary(state, packs)).toMatchObject({
      onChargeCount: 0,
      total: 3,
    })
    expect(batteryOnChargeSummary(state, packs).stillOut).toHaveLength(3)
  })

  it('records which packs went back on charge', () => {
    let state = emptyBatteryOnCharge('lesson-1')
    state = toggleBatteryOnCharge(state, 'ttf-0002')
    state = toggleBatteryOnCharge(state, 'ttf-0003')
    expect(isBatteryOnCharge(state, 'ttf-0002')).toBe(true)
    expect(isBatteryOnCharge(state, 'ttf-0001')).toBe(false)

    const summary = batteryOnChargeSummary(state, packs)
    expect(summary.onCharge.map((pack) => pack.droneName)).toEqual(['Drone 2', 'Drone 3'])
    expect(summary.stillOut.map((pack) => pack.droneName)).toEqual(['Drone 1'])
    expect(summary.onChargeCount).toBe(2)
  })

  it('setBatteryOnCharge is idempotent when already right', () => {
    const base = setBatteryOnCharge(emptyBatteryOnCharge('lesson-1'), 'ttf-0001', true)
    expect(setBatteryOnCharge(base, 'ttf-0001', true)).toBe(base)
  })

  it('resets when the lesson changes', () => {
    const charged = toggleBatteryOnCharge(emptyBatteryOnCharge('lesson-1'), 'ttf-0001')
    const next = ensureBatteryOnChargeLesson(charged, 'lesson-2')
    expect(next.onCharge).toEqual([])
    expect(ensureBatteryOnChargeLesson(charged, 'lesson-1')).toBe(charged)
  })
})
