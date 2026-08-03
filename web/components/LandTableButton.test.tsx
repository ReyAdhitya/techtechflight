import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LandTableButton } from './LandTableButton'

const tableA = [
  { droneId: 'ttf-0001', airborne: true },
  { droneId: 'ttf-0002', airborne: false },
  { droneId: 'ttf-0003', airborne: true },
]

const tableB = [
  { droneId: 'ttf-0004', airborne: true },
  { droneId: 'ttf-0005', airborne: true },
]

describe('LandTableButton', () => {
  it('hides when nobody in the group is airborne', () => {
    const { container } = render(
      <LandTableButton
        tableLabel="Table A"
        members={[{ droneId: 'ttf-0001', airborne: false }]}
        onLand={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lands only the airborne craft in the chosen group', () => {
    const onLand = vi.fn()
    render(<LandTableButton tableLabel="Table A" members={tableA} onLand={onLand} />)

    fireEvent.click(screen.getByRole('button', { name: /Land Table A \(2\)/ }))

    expect(onLand).toHaveBeenCalledOnce()
    expect(onLand).toHaveBeenCalledWith(['ttf-0001', 'ttf-0003'])
  })

  it('does not include craft from another table', () => {
    const onLandA = vi.fn()
    const onLandB = vi.fn()
    render(
      <>
        <LandTableButton tableLabel="Table A" members={tableA} onLand={onLandA} />
        <LandTableButton tableLabel="Table B" members={tableB} onLand={onLandB} />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Land Table B/ }))

    expect(onLandB).toHaveBeenCalledWith(['ttf-0004', 'ttf-0005'])
    expect(onLandA).not.toHaveBeenCalled()
  })
})
