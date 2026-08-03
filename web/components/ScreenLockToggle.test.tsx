import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { COMMANDS_LOCKED_REASON, commandLockState, lockedCommandLabel } from '@/lib/screen-lock'
import { ScreenLockToggle } from './ScreenLockToggle'

describe('ScreenLockToggle', () => {
  it('reports pressed state and forwards the toggle', () => {
    const onChange = vi.fn()
    render(<ScreenLockToggle locked={false} onChange={onChange} />)

    const button = screen.getByRole('button', { name: 'Lock screen' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(button)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('reads as locked when pressed', () => {
    render(<ScreenLockToggle locked onChange={vi.fn()} />)

    const button = screen.getByRole('button', { name: 'Screen locked' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('while locked every Command control is disabled and says why', () => {
    const lock = commandLockState(true)
    expect(lock.disabled).toBe(true)
    expect(lock.reason).toBe(COMMANDS_LOCKED_REASON)
    expect(lockedCommandLabel('Stop', true)).toContain(COMMANDS_LOCKED_REASON)

    render(
      <button type="button" disabled={lock.disabled} aria-label={lockedCommandLabel('Stop', true)}>
        Stop
      </button>,
    )
    const stop = screen.getByRole('button', { name: /Stop/ })
    expect(stop).toBeDisabled()
    expect(stop).toHaveAccessibleName(`Stop — ${COMMANDS_LOCKED_REASON}`)
  })
})
