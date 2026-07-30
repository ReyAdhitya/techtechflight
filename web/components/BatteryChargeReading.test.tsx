import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BatteryChargeReading } from './BatteryChargeReading'
import { BatteryGlyph } from './BatteryGlyph'

describe('BatteryGlyph', () => {
  it('fills the body in proportion to charge', () => {
    const { container } = render(<BatteryGlyph fraction={0.5} />)
    const fill = container.querySelector('[data-testid="battery-glyph-fill"]')
    expect(fill).toHaveAttribute('width', '9')
  })

  it('omits the fill when empty', () => {
    const { container } = render(<BatteryGlyph fraction={0} />)
    expect(container.querySelector('[data-testid="battery-glyph-fill"]')).toBeNull()
  })
})

describe('BatteryChargeReading', () => {
  it('shows the iPhone-style glyph beside the charge words', () => {
    render(<BatteryChargeReading fraction={0.63} />)
    expect(screen.getByLabelText(/Battery 63% · about 8 min left/)).toBeInTheDocument()
    expect(screen.getByText('63% · about 8 min left')).toBeInTheDocument()
  })

  it('says when charge is missing', () => {
    render(<BatteryChargeReading fraction={null} />)
    expect(screen.getByText('Charge not reported')).toBeInTheDocument()
  })
})
