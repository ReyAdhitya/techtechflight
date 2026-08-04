import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { RunStepInput } from '@/lib/run-step'
import { RunBar } from './RunBar'

const state = (overrides: Partial<RunStepInput> = {}): RunStepInput => ({
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

describe('RunBar', () => {
  it('reads Step 4 of 12 — Pre-flight check with the next action', () => {
    render(
      <RunBar
        state={state({
          hasScenario: true,
          hasZones: true,
          hasTeams: true,
          preFlightDone: false,
        })}
      />,
    )

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Step 4 of 12 — Pre-flight check',
    )
    expect(screen.getByText(/Tick each craft/i)).toBeInTheDocument()
  })

  it('names the first step when nothing is set up yet', () => {
    render(<RunBar state={state()} />)

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Step 1 of 12 — Select Scenario',
    )
    expect(screen.getByText(/Pick a Mission Scenario/i)).toBeInTheDocument()
  })

  it('uses semantic surface tokens on the bar', () => {
    render(<RunBar state={state()} />)

    const bar = screen.getByRole('heading', { level: 2 }).closest('section')
    expect(bar?.className).toMatch(/border-hairline/)
    expect(bar?.className).toMatch(/bg-surface-1/)
  })
})
