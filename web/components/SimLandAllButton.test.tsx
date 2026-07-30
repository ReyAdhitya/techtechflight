import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SimLandAllButton } from './SimLandAllButton'

describe('SimLandAllButton', () => {
  it('hides when nothing is airborne', () => {
    const { container } = render(<SimLandAllButton airborne={0} onLandAll={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('lands all when pressed', async () => {
    const user = userEvent.setup()
    const onLandAll = vi.fn()
    render(<SimLandAllButton airborne={2} onLandAll={onLandAll} />)

    await user.click(screen.getByRole('button', { name: /Land all \(sim\)/i }))

    expect(onLandAll).toHaveBeenCalledOnce()
  })
})
