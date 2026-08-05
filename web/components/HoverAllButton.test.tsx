import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { HoverAllButton } from './HoverAllButton'

const fleet = [
  { droneId: 'ttf-0001', airborne: true },
  { droneId: 'ttf-0002', airborne: false },
  { droneId: 'ttf-0003', airborne: true },
]

describe('HoverAllButton', () => {
  it('hides when nothing is airborne', () => {
    const { container } = render(
      <HoverAllButton fleet={[{ droneId: 'ttf-0001', airborne: false }]} onHover={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  /*
   * It shared Land all's hold. Hovering is the least consequential thing a Teacher can do
   * to the room: everything stays where it is and nothing has to be recovered from
   * (DECISIONS, 2026-08-05).
   */
  it('hovers every airborne craft on one press', () => {
    const onHover = vi.fn()
    render(<HoverAllButton fleet={fleet} onHover={onHover} />)

    fireEvent.click(screen.getByRole('button', { name: 'Hover all (2)' }))

    expect(onHover).toHaveBeenCalledTimes(2)
    expect(onHover).toHaveBeenCalledWith('ttf-0001')
    expect(onHover).toHaveBeenCalledWith('ttf-0003')
    expect(onHover).not.toHaveBeenCalledWith('ttf-0002')
  })
})
