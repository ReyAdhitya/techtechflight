import { describe, expect, it } from 'vitest'
import {
  estimatedFlightMinutes,
  formatBatteryTimeBudget,
  FULL_CHARGE_FLIGHT_MINUTES,
  isLowBatteryBudget,
  LOW_BUDGET_FRACTION,
} from './battery-budget'

describe('estimatedFlightMinutes', () => {
  it('scales charge linearly against twelve minutes at full', () => {
    expect(FULL_CHARGE_FLIGHT_MINUTES).toBe(12)
    expect(estimatedFlightMinutes(1)).toBe(12)
    expect(estimatedFlightMinutes(0.5)).toBe(6)
    expect(estimatedFlightMinutes(0.71)).toBeCloseTo(8.52)
  })
})

describe('isLowBatteryBudget', () => {
  it('warns under twenty percent of a full charge', () => {
    expect(LOW_BUDGET_FRACTION).toBe(0.2)
    expect(isLowBatteryBudget(0.19)).toBe(true)
    expect(isLowBatteryBudget(0.2)).toBe(false)
    expect(isLowBatteryBudget(null)).toBe(false)
  })
})

describe('formatBatteryTimeBudget', () => {
  it('rounds to whole minutes and carries the tilde in words', () => {
    expect(formatBatteryTimeBudget(0.71)).toBe('about 9 min left')
    expect(formatBatteryTimeBudget(0.5)).toBe('about 6 min left')
    expect(formatBatteryTimeBudget(1)).toBe('about 12 min left')
  })

  it('says under a minute when the budget is nearly gone', () => {
    expect(formatBatteryTimeBudget(0.04)).toBe('under a minute left')
  })

  it('uses singular minute at one', () => {
    expect(formatBatteryTimeBudget(1 / 12)).toBe('about 1 min left')
  })
})
