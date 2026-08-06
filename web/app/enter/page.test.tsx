import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { BOARD_ROLE_KEY, clearBoardRole, writeBoardRole } from '@/lib/role'
import EnterPage from './page'

const replace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn() }),
}))

beforeEach(() => {
  replace.mockClear()
  window.localStorage.removeItem(BOARD_ROLE_KEY)
})

afterEach(() => {
  clearBoardRole()
})

describe('/enter', () => {
  it('shows Teacher and Student when no role is stored', async () => {
    render(<EnterPage />)

    expect(await screen.findByRole('button', { name: /I am the Teacher/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /I am a Student/i })).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('skips the door when this device is already Teacher', async () => {
    writeBoardRole('teacher')
    render(<EnterPage />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(replace).toHaveBeenCalledWith('/lesson')
    expect(screen.queryByRole('button', { name: /I am the Teacher/i })).not.toBeInTheDocument()
  })

  it('skips the door when this device is already Student', async () => {
    writeBoardRole('student')
    render(<EnterPage />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(replace).toHaveBeenCalledWith('/student')
    expect(screen.queryByRole('button', { name: /I am a Student/i })).not.toBeInTheDocument()
  })
})
