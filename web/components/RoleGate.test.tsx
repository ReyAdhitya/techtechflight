import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  BOARD_ROLE_KEY,
  TAB_ROLE_KEY,
  clearBoardRole,
  clearTabRole,
  readTabRole,
  writeBoardRole,
  writeTabRole,
} from '@/lib/role'
import { clearTeacherPin, setTeacherPin } from '@/lib/teacher-pin'
import { RequireRole } from './RoleGate'

const replace = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/mission',
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn() }),
}))

beforeEach(() => {
  replace.mockClear()
  window.localStorage.removeItem(BOARD_ROLE_KEY)
  window.sessionStorage.removeItem(TAB_ROLE_KEY)
  clearTeacherPin()
})

afterEach(() => {
  clearBoardRole()
  clearTabRole()
  clearTeacherPin()
})

/**
 * The address decides what a tab is, and the PIN decides who may see the Teacher's half.
 *
 * The remembered role used to overrule the address, so every new tab inherited the last role
 * anybody picked and one browser could not hold a board and a tablet at once. What replaced it
 * is not weaker: the redirect it removed was never a lock, because it sent a child to
 * `/student` rather than asking them for anything.
 */
describe('RequireRole', () => {
  it('gives a tab the Student app because the address said so, whatever the device remembers', () => {
    writeBoardRole('teacher')

    render(
      <RequireRole role="student">
        <p>Student only</p>
      </RequireRole>,
    )

    expect(screen.getByText('Student only')).toBeInTheDocument()
    expect(readTabRole()).toBe('student')
    expect(replace).not.toHaveBeenCalled()
  })

  /* Two tabs of one browser, one of each. This is the whole point of the change. */
  it('lets a Teacher board and a Student tablet exist in one browser at once', () => {
    writeBoardRole('teacher')

    // The Teacher's own tab, already settled.
    const board = render(
      <RequireRole role="teacher">
        <p>Teacher board</p>
      </RequireRole>,
    )
    expect(screen.getByText('Teacher board')).toBeInTheDocument()
    board.unmount()

    /*
     * The second tab has its own `sessionStorage`, which is what makes this true in a browser
     * and what a single jsdom cannot reproduce: one document, one session store. Cleared by
     * hand to stand in for the second tab, and the browser walk is what proves the real thing.
     */
    clearTabRole()

    render(
      <RequireRole role="student">
        <p>Student tablet</p>
      </RequireRole>,
    )
    expect(screen.getByText('Student tablet')).toBeInTheDocument()
  })

  /* The lock did not move. A child typing the Teacher's address meets the PIN. */
  it('asks a child who types the Teacher address for the PIN', () => {
    setTeacherPin('4821')
    writeBoardRole('student')

    render(
      <RequireRole role="teacher">
        <p>Teacher secret</p>
      </RequireRole>,
    )

    expect(screen.queryByText('Teacher secret')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Teacher PIN')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Teacher PIN'), { target: { value: '1111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    expect(screen.getByRole('alert')).toHaveTextContent('That is not the PIN.')
    expect(screen.queryByText('Teacher secret')).not.toBeInTheDocument()
  })

  it('lets the right PIN through, and only for this tab', () => {
    setTeacherPin('4821')
    writeBoardRole('student')

    render(
      <RequireRole role="teacher">
        <p>Teacher secret</p>
      </RequireRole>,
    )

    fireEvent.change(screen.getByLabelText('Teacher PIN'), { target: { value: '4821' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))

    expect(screen.getByText('Teacher secret')).toBeInTheDocument()
    expect(readTabRole()).toBe('teacher')
    /*
     * And the iPad still remembers it is a child's. Answering the PIN on a borrowed device
     * must not leave it routing to the Teacher board tomorrow morning.
     */
    expect(window.localStorage.getItem(BOARD_ROLE_KEY)).toBe('student')
  })

  it('does not ask again in a tab that has already answered', () => {
    setTeacherPin('4821')
    writeBoardRole('student')
    writeTabRole('teacher')

    render(
      <RequireRole role="teacher">
        <p>Teacher secret</p>
      </RequireRole>,
    )

    expect(screen.getByText('Teacher secret')).toBeInTheDocument()
    expect(screen.queryByLabelText('Teacher PIN')).not.toBeInTheDocument()
  })

  /*
   * A laptop that answered the PIN at the door is nobody else's. Asking again on every reload
   * is ceremony, and it is the behaviour this product already had.
   */
  it('does not ask a device that is remembered as the Teacher', () => {
    setTeacherPin('4821')
    writeBoardRole('teacher')

    render(
      <RequireRole role="teacher">
        <p>Teacher secret</p>
      </RequireRole>,
    )

    expect(screen.getByText('Teacher secret')).toBeInTheDocument()
    expect(screen.queryByLabelText('Teacher PIN')).not.toBeInTheDocument()
  })

  /*
   * First morning, no PIN set. The door asks a Teacher to choose one rather than refusing
   * every answer, and the gate on the route has to behave the same way or a fresh browser
   * opened at `/mission` is a dead end.
   */
  it('asks the first Teacher through to choose a PIN', () => {
    render(
      <RequireRole role="teacher">
        <p>Teacher secret</p>
      </RequireRole>,
    )

    expect(
      screen.getByRole('heading', { name: 'Choose a four digit PIN' }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Choose a four digit PIN'), {
      target: { value: '9042' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))

    expect(screen.getByText('Teacher secret')).toBeInTheDocument()
  })

  /* Nothing on the route sends anybody anywhere any more. The address is the answer. */
  it('never redirects', () => {
    writeBoardRole('student')

    render(
      <RequireRole role="student">
        <p>Student only</p>
      </RequireRole>,
    )

    expect(replace).not.toHaveBeenCalled()
  })
})
