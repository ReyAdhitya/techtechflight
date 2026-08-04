import { describe, expect, it } from 'vitest'
import { RUN_STEP_COUNT, runStep, runStepLabel, type RunStepInput } from './run-step.ts'

/**
 * The Run bar step — derived from Mission records, never from a tour counter.
 *
 * Acceptance pins step 4 at pre-flight; the rest walk the twelve gates in order and
 * the in-flight priorities (alerts before monitoring, landing before map-watching).
 */

const base = (overrides: Partial<RunStepInput> = {}): RunStepInput => ({
  hasScenario: false,
  hasZones: false,
  hasTeams: false,
  preFlightDone: false,
  briefingDone: false,
  hasPendingClearance: false,
  missionStarted: false,
  hasAlerts: false,
  allDown: false,
  confirmedComplete: false,
  onReports: false,
  ...overrides,
})

describe('runStep — setup, in order', () => {
  it('starts at Select Scenario', () => {
    const reading = runStep(base())
    expect(reading.step).toBe(1)
    expect(reading.totalSteps).toBe(RUN_STEP_COUNT)
    expect(reading.label).toBe('Select Scenario')
    expect(reading.nextAction).toMatch(/Pick a Mission Scenario/i)
  })

  it('reads Step 4 of 12 — Pre-flight check when teams are assigned but checks are open', () => {
    const reading = runStep(
      base({
        hasScenario: true,
        hasZones: true,
        hasTeams: true,
        preFlightDone: false,
      }),
    )
    expect(reading.step).toBe(4)
    expect(reading.label).toBe('Pre-flight check')
    expect(reading.nextAction).toMatch(/pre-flight check/i)
  })

  it('moves through zones, teams, briefing and clearance', () => {
    expect(runStep(base({ hasScenario: true })).step).toBe(2)
    expect(runStep(base({ hasScenario: true, hasZones: true })).step).toBe(3)
    expect(
      runStep(base({ hasScenario: true, hasZones: true, hasTeams: true, preFlightDone: true }))
        .step,
    ).toBe(5)
    expect(
      runStep(
        base({
          hasScenario: true,
          hasZones: true,
          hasTeams: true,
          preFlightDone: true,
          briefingDone: true,
          hasPendingClearance: true,
        }),
      ).step,
    ).toBe(6)
  })
})

describe('runStep — in flight', () => {
  const flying = base({
    hasScenario: true,
    hasZones: true,
    hasTeams: true,
    preFlightDone: true,
    briefingDone: true,
    missionStarted: true,
  })

  it('defaults to Monitor on Map while craft are up and nothing else applies', () => {
    expect(runStep(flying).label).toBe('Monitor on Map')
  })

  it('raises Handle Alerts above monitoring when something needs the Teacher', () => {
    expect(runStep({ ...flying, hasAlerts: true }).step).toBe(10)
  })

  it('can name Issue Commands or Watch Telemetry when flagged', () => {
    expect(runStep({ ...flying, needsCommands: true }).step).toBe(9)
    expect(runStep({ ...flying, watchingTelemetry: true }).step).toBe(8)
    expect(runStep({ ...flying, hasAlerts: true, needsCommands: true }).step).toBe(10)
  })
})

describe('runStep — wrap-up', () => {
  const landed = base({
    hasScenario: true,
    hasZones: true,
    hasTeams: true,
    preFlightDone: true,
    briefingDone: true,
    missionStarted: true,
    allDown: true,
  })

  it('asks to Confirm Completion once every craft is down', () => {
    expect(runStep(landed).step).toBe(11)
  })

  it('opens Review on Reports or after the Teacher confirms complete', () => {
    expect(runStep({ ...landed, confirmedComplete: true }).step).toBe(12)
    expect(runStep({ ...landed, onReports: true }).step).toBe(12)
  })
})

describe('runStepLabel', () => {
  it('names every step from 1 to 12', () => {
    for (let step = 1; step <= RUN_STEP_COUNT; step += 1) {
      expect(runStepLabel(step)).toMatch(/^[A-Z]/)
    }
  })
})
