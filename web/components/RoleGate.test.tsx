import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
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

  /*
   * The board ships as a static export, so every visit is a hydration. Reading the role in
   * the render body made the exported HTML and the browser's first render disagree, and
   * React threw #418 and rebuilt the whole tree client-side on every page load. Nothing in
   * a jsdom suite noticed, because `render()` is a fresh client render and never hydrates.
   * This is the only test in the suite that actually hydrates, so it is the only one that
   * can see the defect at all.
   */
  it('hydrates the exported page without a mismatch', () => {
    writeBoardRole('teacher')
    const tree = (
      <RequireRole role="teacher">
        <p>Teacher secret</p>
      </RequireRole>
    )

    // What the export contains: built with no device to read a role from.
    const exported = renderToString(tree)
    expect(exported).toContain('Opening')
    expect(exported).not.toContain('Teacher secret')

    const complaints: unknown[][] = []
    const consoleError = vi.spyOn(console, 'error').mockImplementation((...args) => {
      complaints.push(args)
    })
    const host = document.createElement('div')
    host.innerHTML = exported
    document.body.appendChild(host)

    act(() => {
      hydrateRoot(host, tree)
    })

    expect(complaints).toEqual([])
    // And the Teacher still gets their board, on the commit after hydration.
    expect(host.textContent).toContain('Teacher secret')

    consoleError.mockRestore()
    host.remove()
  })
})
