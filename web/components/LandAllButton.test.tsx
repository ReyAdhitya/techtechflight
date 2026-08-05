import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LandAllButton } from './LandAllButton'

const fleet = [
  { droneId: 'ttf-0001', airborne: true },
  { droneId: 'ttf-0002', airborne: false },
  { droneId: 'ttf-0003', airborne: true },
]

describe('LandAllButton', () => {
  it('hides when nothing is airborne', () => {
    const { container } = render(
      <LandAllButton fleet={[{ droneId: 'ttf-0001', airborne: false }]} onLand={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  /*
   * It used to want about a second of held pointer, and a keyboard path that armed on the
   * first press and fired on the second. A Teacher reaching for Land all is usually
   * reaching for it because something is going wrong, and a control that ignores the first
   * press has to be learned before it works (DECISIONS, 2026-08-05).
   */
  it('lands every airborne craft on one press', () => {
    const onLand = vi.fn()
    render(<LandAllButton fleet={fleet} onLand={onLand} />)

    fireEvent.click(screen.getByRole('button', { name: /Land all/ }))

    expect(onLand).toHaveBeenCalledTimes(2)
    expect(onLand).toHaveBeenCalledWith('ttf-0001')
    expect(onLand).toHaveBeenCalledWith('ttf-0003')
    expect(onLand).not.toHaveBeenCalledWith('ttf-0002')
  })

  it('says how many craft it is about to land', () => {
    render(<LandAllButton fleet={fleet} onLand={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Land all (2)' })).toBeInTheDocument()
  })
})
