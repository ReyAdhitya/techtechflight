import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { StopAllButton } from './StopAllButton'

const fleet = [
  { droneId: 'ttf-0001', airborne: true },
  { droneId: 'ttf-0002', airborne: false },
  { droneId: 'ttf-0003', airborne: true },
]

describe('StopAllButton', () => {
  it('hides when nothing is airborne', () => {
    const { container } = render(
      <StopAllButton fleet={[{ droneId: 'ttf-0001', airborne: false }]} onStop={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  /*
   * The hold had a real argument here — Stop cuts the motors. It goes because per-strip
   * Stop has always been a single press (DESIGN §4.5), and one word cannot mean "at once"
   * on a strip and "hold me" on the fleet row (DECISIONS, 2026-08-05).
   */
  it('stops every airborne craft on one press', () => {
    const onStop = vi.fn()
    render(<StopAllButton fleet={fleet} onStop={onStop} />)

    fireEvent.click(screen.getByRole('button', { name: 'Stop all (2)' }))

    expect(onStop).toHaveBeenCalledTimes(2)
    expect(onStop).toHaveBeenCalledWith('ttf-0001')
    expect(onStop).toHaveBeenCalledWith('ttf-0003')
    expect(onStop).not.toHaveBeenCalledWith('ttf-0002')
  })
})
