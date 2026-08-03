import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('does not land on a short press', async () => {
    const onLand = vi.fn()
    render(<LandAllButton fleet={fleet} onLand={onLand} holdMs={200} />)

    const button = screen.getByRole('button', { name: /Land all/ })
    fireEvent.pointerDown(button)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40))
    })
    fireEvent.pointerUp(button)

    expect(onLand).not.toHaveBeenCalled()
  })

  it('requires a sustained press, then issues land to every airborne craft', async () => {
    const onLand = vi.fn()
    render(<LandAllButton fleet={fleet} onLand={onLand} holdMs={80} />)

    const button = screen.getByRole('button', { name: /Land all/ })
    fireEvent.pointerDown(button)

    await waitFor(
      () => {
        expect(onLand).toHaveBeenCalledTimes(2)
      },
      { timeout: 2_000 },
    )
    expect(onLand).toHaveBeenCalledWith('ttf-0001')
    expect(onLand).toHaveBeenCalledWith('ttf-0003')
    expect(onLand).not.toHaveBeenCalledWith('ttf-0002')
  })

  it('offers a keyboard second press instead of a hold', () => {
    const onLand = vi.fn()
    render(<LandAllButton fleet={fleet} onLand={onLand} />)

    const button = screen.getByRole('button', { name: /Land all/ })
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(onLand).not.toHaveBeenCalled()
    expect(button).toHaveAccessibleName(/Press again to land all/)

    fireEvent.keyDown(button, { key: 'Enter' })
    expect(onLand).toHaveBeenCalledTimes(2)
  })
})
