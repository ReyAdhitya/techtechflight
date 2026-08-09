import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { StudentStepRail } from './StudentStepRail'

/**
 * The rail on a Student's tablet, and the one property that matters most about it.
 *
 * ADR-0028: it shows all twelve and **not one row is pressable**. That is what keeps
 * ADR-0025's two-press rule true, because fourteen pressable things of which twelve do
 * nothing is not two, and a child who pressed *Land* on a rail and watched nothing happen
 * has learned that the screen lies.
 */
describe('the Student step rail', () => {
  it('shows all twelve steps of the lesson', () => {
    render(<StudentStepRail current={1} name="Amira" droneName="Drone 1" />)

    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(12)
    expect(within(rows[0]!).getByText('Briefing')).toBeInTheDocument()
    expect(within(rows[6]!).getByText('Fly the points')).toBeInTheDocument()
    expect(within(rows[11]!).getByText('Score')).toBeInTheDocument()
  })

  /* The whole of ADR-0028 in one assertion. */
  it('offers nothing to press, anywhere', () => {
    const { container } = render(
      <StudentStepRail current={7} name="Amira" droneName="Drone 1" />,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('[tabindex]')).toBeNull()
    expect(container.querySelector('a, button, input, select, textarea')).toBeNull()
  })

  it('says so out loud, so a Student does not try', () => {
    render(<StudentStepRail current={1} name="Amira" droneName="Drone 1" />)

    expect(screen.getByText('Look only. Nothing here is pressable.')).toBeInTheDocument()
  })

  it('marks where they are, and only that one', () => {
    render(<StudentStepRail current={7} name="Amira" droneName="Drone 1" />)

    expect(screen.getAllByText('You are here.')).toHaveLength(1)
    const rows = screen.getAllByRole('listitem')
    expect(rows[6]).toHaveAttribute('data-state', 'now')
    expect(rows[5]).toHaveAttribute('data-state', 'done')
    expect(rows[7]).toHaveAttribute('data-state', 'ahead')
  })

  /* Colour is never the only channel (ADR-0004), on a projector or a tablet in daylight. */
  it('gives every row a word as well as a fill', () => {
    render(<StudentStepRail current={7} name="Amira" droneName="Drone 1" />)

    expect(screen.getAllByText('Done.')).toHaveLength(6)
    expect(screen.getAllByText('Still to come.')).toHaveLength(5)
  })

  it('names the Student and their Drone, and says so when they have none', () => {
    const { rerender } = render(
      <StudentStepRail current={1} name="Amira" droneName="Drone 1" teamName="Team Alpha" />,
    )
    expect(screen.getByText('Team Alpha, Drone 1')).toBeInTheDocument()

    rerender(<StudentStepRail current={1} name="Amira" droneName={null} />)
    expect(screen.getByText('No Drone yet')).toBeInTheDocument()
  })
})
