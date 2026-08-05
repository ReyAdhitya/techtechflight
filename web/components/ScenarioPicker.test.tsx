import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MISSION_SCENARIOS } from '@/lib/mission-scenarios'
import { ScenarioPicker } from './ScenarioPicker'

describe('ScenarioPicker', () => {
  it('shows three cards with objective, success criteria and common risks', () => {
    render(<ScenarioPicker selectedScenarioId={null} onSelect={() => {}} locked={false} />)

    expect(screen.getByRole('heading', { name: 'Mission Scenario' })).toBeInTheDocument()

    for (const scenario of MISSION_SCENARIOS) {
      const card = screen.getByRole('button', { name: new RegExp(scenario.name) })
      expect(card).toBeInTheDocument()
      expect(card).toHaveTextContent(scenario.objective)
      for (const criterion of scenario.successCriteria) {
        expect(card).toHaveTextContent(criterion)
      }
      for (const risk of scenario.commonRisks) {
        expect(card).toHaveTextContent(risk)
      }
    }
  })

  it('says plainly when no Scenario is chosen yet', () => {
    render(<ScenarioPicker selectedScenarioId={null} onSelect={() => {}} locked={false} />)

    expect(screen.getByText(/No Scenario chosen yet/i)).toBeInTheDocument()
    expect(screen.getByText(/until the first Clearance is granted/i)).toBeInTheDocument()
  })

  it('calls onSelect when a card is picked and marks it pressed', () => {
    const onSelect = vi.fn()
    render(<ScenarioPicker selectedScenarioId={null} onSelect={onSelect} locked={false} />)

    fireEvent.click(screen.getByRole('button', { name: /Search and Rescue/i }))
    expect(onSelect).toHaveBeenCalledWith('search-rescue')
  })

  it('shows which Scenario is selected', () => {
    render(
      <ScenarioPicker selectedScenarioId="delivery" onSelect={() => {}} locked={false} />,
    )

    expect(screen.getByRole('button', { name: /Delivery/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: /Search and Rescue/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByText(/you can still change it until the first Clearance/i)).toBeInTheDocument()
  })

  it('locks the choice after the first Clearance', () => {
    const onSelect = vi.fn()
    render(
      <ScenarioPicker selectedScenarioId="building-inspection" onSelect={onSelect} locked />,
    )

    expect(screen.getByText(/first Clearance has been granted/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Building Inspection/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Search and Rescue/i }))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
