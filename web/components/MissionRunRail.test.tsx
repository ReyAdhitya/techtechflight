import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { RunStepInput } from '@/lib/run-step'
import { MissionRunRail } from './MissionRunRail'

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

describe('MissionRunRail', () => {
  it('lists all twelve steps under Preparation, Live and Wrap-up', () => {
    render(<MissionRunRail state={state()} />)

    const nav = screen.getByRole('navigation', { name: /Mission run steps/i })
    expect(within(nav).getByText('Preparation')).toBeInTheDocument()
    expect(within(nav).getByText('Live operations')).toBeInTheDocument()
    expect(within(nav).getByText('Wrap-up')).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: /Select Scenario/i })).toHaveAttribute(
      'href',
      '/lesson#mission-scenario',
    )
    expect(within(nav).getByRole('link', { name: /Review Logs/i })).toHaveAttribute(
      'href',
      '/reports#mission-review',
    )
    expect(within(nav).getAllByRole('link')).toHaveLength(12)
  })

  it('marks the derived current step and says what to do next', () => {
    render(
      <MissionRunRail
        state={state({
          hasScenario: true,
          hasZones: true,
          hasTeams: true,
        })}
      />,
    )

    const nav = screen.getByRole('navigation', { name: /Mission run steps/i })
    expect(nav).toHaveTextContent(/Step 4 of 12/)
    expect(nav).toHaveTextContent(/Tick each craft/)
    expect(screen.getByRole('link', { name: /Pre-flight check/i })).toHaveAttribute(
      'aria-current',
      'step',
    )
  })

  it('sends live steps to Control and wrap-up to Reports', () => {
    render(
      <MissionRunRail
        state={state({
          hasScenario: true,
          hasZones: true,
          hasTeams: true,
          preFlightDone: true,
          briefingDone: true,
          missionStarted: true,
        })}
      />,
    )

    expect(screen.getByRole('link', { name: /Monitor on Map/i })).toHaveAttribute(
      'href',
      '/control#mission-map',
    )
    expect(screen.getByRole('link', { name: /Handle Alerts/i })).toHaveAttribute(
      'href',
      '/control#mission-alerts',
    )
  })
})
