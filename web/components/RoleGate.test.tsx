import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { BOARD_ROLE_KEY, clearBoardRole, writeBoardRole } from '@/lib/role'
import { RequireRole } from './RoleGate'

const replace = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/lesson',
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn() }),
}))

beforeEach(() => {
  replace.mockClear()
  window.localStorage.removeItem(BOARD_ROLE_KEY)
})

afterEach(() => {
  clearBoardRole()
})

describe('RequireRole', () => {
  it('never mounts Teacher chrome for a Student device', () => {
    writeBoardRole('student')

    render(
      <RequireRole role="teacher">
        <p>Teacher secret</p>
      </RequireRole>,
    )

    expect(screen.queryByText('Teacher secret')).not.toBeInTheDocument()
    expect(screen.getByText(/Opening/i)).toBeInTheDocument()
    expect(replace).toHaveBeenCalledWith('/student')
  })

  it('never mounts Student chrome for a Teacher device', () => {
    writeBoardRole('teacher')

    render(
      <RequireRole role="student">
        <p>Student only</p>
      </RequireRole>,
    )

    expect(screen.queryByText('Student only')).not.toBeInTheDocument()
    expect(replace).toHaveBeenCalledWith('/lesson')
  })

  it('shows Teacher chrome only when the role is Teacher', () => {
    writeBoardRole('teacher')

    render(
      <RequireRole role="teacher">
        <p>Teacher secret</p>
      </RequireRole>,
    )

    expect(screen.getByText('Teacher secret')).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('sends a device with no role to the door', () => {
    render(
      <RequireRole role="teacher">
        <p>Teacher secret</p>
      </RequireRole>,
    )

    expect(screen.queryByText('Teacher secret')).not.toBeInTheDocument()
    expect(replace).toHaveBeenCalledWith('/enter')
  })

  it('kicks a Student out of Teacher chrome if the role flips mid-session', () => {
    writeBoardRole('teacher')

    const { rerender } = render(
      <RequireRole role="teacher">
        <p>Teacher secret</p>
      </RequireRole>,
    )

    expect(screen.getByText('Teacher secret')).toBeInTheDocument()

    act(() => {
      writeBoardRole('student')
    })
    rerender(
      <RequireRole role="teacher">
        <p>Teacher secret</p>
      </RequireRole>,
    )

    expect(screen.queryByText('Teacher secret')).not.toBeInTheDocument()
    expect(replace).toHaveBeenCalledWith('/student')
  })
})
