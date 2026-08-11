import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { StudentStepRail } from './StudentStepRail'

/**
 * The rail on a Student's tablet, and the one property that matters most about it.
 *
 * ADR-0028, as amended by ADR-0031: a step that has **already happened** can be tapped and
 * re-read; a later step is not a link, not a button and not focusable. A child who pressed
 * *Land* on a rail and watched nothing happen has learned that the screen lies, and that is
 * still refused. Looking back asks for nothing and moves nothing.
 *
 * ADR-0025's two presses are untouched: those are Mission presses on the stage, and these are
 * in the rail, in exactly the way joining and leaving are not one of the two.
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

  /* Handed no way to look back, it is the look-only rail ADR-0028 shipped. */
  it('offers nothing to press when looking back is not on offer', () => {
    const { container } = render(
      <StudentStepRail current={7} name="Amira" droneName="Drone 1" />,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(container.querySelector('[tabindex]')).toBeNull()
    expect(container.querySelector('a, button, input, select, textarea')).toBeNull()
    expect(screen.getByText('Look only. Nothing here is pressable.')).toBeInTheDocument()
  })

  /* The whole of ADR-0031 in one assertion: behind them yes, ahead of them never. */
  it('lets a Student tap what already happened, and nothing else', () => {
    const onLookBack = vi.fn()
    render(
      <StudentStepRail
        current={7}
        name="Amira"
        droneName="Drone 1"
        onLookBack={onLookBack}
      />,
    )

    const rows = screen.getAllByRole('listitem')
    expect(screen.getAllByRole('button')).toHaveLength(6)
    expect(within(rows[1]!).getByRole('button')).toBeInTheDocument()
    expect(within(rows[6]!).queryByRole('button')).not.toBeInTheDocument()
    expect(within(rows[7]!).queryByRole('button')).not.toBeInTheDocument()

    // Nothing ahead is even reachable by a wandering finger or a tab key.
    for (const row of rows.slice(6)) {
      expect(row.querySelector('a, button, [tabindex]')).toBeNull()
    }

    fireEvent.click(within(rows[1]!).getByRole('button'))
    expect(onLookBack).toHaveBeenCalledWith(2)
  })

  it('tells a Student the rows behind them can be read again', () => {
    render(
      <StudentStepRail current={7} name="Amira" droneName="Drone 1" onLookBack={vi.fn()} />,
    )

    expect(screen.getByText('Tap a step you have done to read it again.')).toBeInTheDocument()
  })

  /*
   * The way back, for when the lesson does not move on its own. Without it a child who tapped
   * back is stuck reading history while their Teacher waits, which is the trap this whole
   * change exists to avoid rather than create.
   */
  it('always offers a way back to now while something is being re-read', () => {
    const onBackToNow = vi.fn()
    render(
      <StudentStepRail
        current={7}
        name="Amira"
        droneName="Drone 1"
        reading={2}
        onLookBack={vi.fn()}
        onBackToNow={onBackToNow}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to now' }))
    expect(onBackToNow).toHaveBeenCalled()
  })

  /*
   * Being re-read and being here are two different things and they must not look alike: the
   * brand fill goes on "you are here" and nothing else, or a child reading step 2 sees two
   * rows claiming to be the present.
   */
  it('marks the row being read apart from the row they are on', () => {
    render(
      <StudentStepRail
        current={7}
        name="Amira"
        droneName="Drone 1"
        reading={2}
        onLookBack={vi.fn()}
        onBackToNow={vi.fn()}
      />,
    )

    const rows = screen.getAllByRole('listitem')
    expect(screen.getAllByText('You are here.')).toHaveLength(1)
    expect(rows[6]).toHaveAttribute('data-state', 'now')
    expect(within(rows[1]!).getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    expect(within(rows[0]!).getByRole('button')).toHaveAttribute('aria-pressed', 'false')
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
