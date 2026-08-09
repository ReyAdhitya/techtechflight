import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MissionCraftDownList } from './MissionCraftDownList'

/**
 * The list that makes step 11's refusal answerable.
 *
 * Step 11 used to close entirely while a craft was up, so a Teacher who pressed *Mission
 * complete* got one line of text and nothing to press, with the Recall that would have fixed
 * it four steps back on a board they had just left. These assertions are about the way out.
 */

const craft = [
  { droneId: 'ttf-0001', droneName: 'Drone 1', airborne: false },
  { droneId: 'ttf-0002', droneName: 'Drone 2', airborne: true },
] as const

describe('the Mission Drones at close-down', () => {
  it('says which are down and which are still up, in words', () => {
    render(<MissionCraftDownList craft={craft} onCommand={() => {}} />)

    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]!).getByText('Down')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Still airborne')).toBeInTheDocument()
  })

  /*
   * Only against a Drone that is up. A Command offered to one sitting on the ground is a
   * press that does nothing, and a Teacher scanning the list would have to read each row to
   * find out which buttons meant anything.
   */
  it('offers Recall and Land against a Drone that is up, and against no other', () => {
    render(<MissionCraftDownList craft={craft} onCommand={() => {}} />)

    const rows = screen.getAllByRole('listitem')
    expect(within(rows[0]!).queryByRole('button')).not.toBeInTheDocument()
    expect(within(rows[1]!).getByRole('button', { name: 'Recall' })).toBeInTheDocument()
    expect(within(rows[1]!).getByRole('button', { name: 'Land' })).toBeInTheDocument()
  })

  it('sends the Command for the Drone whose row it was pressed on', () => {
    const onCommand = vi.fn()
    render(<MissionCraftDownList craft={craft} onCommand={onCommand} />)

    fireEvent.click(screen.getByRole('button', { name: 'Recall' }))
    expect(onCommand).toHaveBeenCalledWith('ttf-0002', 'return-home')

    fireEvent.click(screen.getByRole('button', { name: 'Land' }))
    expect(onCommand).toHaveBeenCalledWith('ttf-0002', 'land')
  })

  it('renders nothing at all when the Mission has no Drones on it', () => {
    const { container } = render(<MissionCraftDownList craft={[]} onCommand={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
