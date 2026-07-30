import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { QuietModeToggle } from './QuietModeToggle'

describe('quiet mode toggle', () => {
  it('reports pressed state and forwards clicks', () => {
    let enabled = false
    render(<QuietModeToggle enabled={enabled} onChange={(next) => (enabled = next)} />)
    const button = screen.getByRole('button', { name: 'Quiet mode' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(button)
    expect(enabled).toBe(true)
  })
})
