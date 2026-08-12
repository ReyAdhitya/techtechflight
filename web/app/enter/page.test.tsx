import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { BOARD_ROLE_KEY, clearBoardRole, readBoardRole, writeBoardRole } from '@/lib/role'
import { TEACHER_PIN_KEY, clearTeacherPin, setTeacherPin } from '@/lib/teacher-pin'
import { openClassroom, resetClassroomForTests } from '@/lib/classroom-session'
import EnterPage from './page'

const replace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn() }),
}))

/*
 * The classroom store is stubbed, and it has to be. Since the store became a built-in
 * absolute URL rather than a same-origin route, an unknown code reaches for the real
 * internet, and a suite that does that is slow, flaky and offline-hostile. The stub answers
 * the way the Worker does for a code nobody has opened: 404, "no classroom with that code".
 */
beforeEach(() => {
  replace.mockClear()
  window.localStorage.removeItem(BOARD_ROLE_KEY)
  window.localStorage.removeItem(TEACHER_PIN_KEY)
  resetClassroomForTests()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'No classroom with that code yet.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearBoardRole()
  clearTeacherPin()
  resetClassroomForTests()
})

describe('/enter', () => {
  it('asks one question with two identical boxes and one word in each', async () => {
    render(<EnterPage />)

    expect(await screen.findByRole('heading', { name: 'Who is using this device?' }))
      .toBeInTheDocument()
    const teacher = screen.getByRole('button', { name: 'Teacher' })
    const student = screen.getByRole('button', { name: 'Student' })

    // Identical: no filled-versus-outlined pair, which reads as an answer and an afterthought.
    expect(teacher.className).toBe(student.className)
    // No grey subtitle under either.
    expect(teacher.textContent).toBe('Teacher')
    expect(student.textContent).toBe('Student')
    expect(replace).not.toHaveBeenCalled()
  })

  it('skips the door when this device is already Teacher', async () => {
    writeBoardRole('teacher')
    render(<EnterPage />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(replace).toHaveBeenCalledWith('/lesson')
    expect(screen.queryByRole('button', { name: 'Teacher' })).not.toBeInTheDocument()
  })

  it('skips the door when this device is already Student', async () => {
    writeBoardRole('student')
    render(<EnterPage />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(replace).toHaveBeenCalledWith('/student')
    expect(screen.queryByRole('button', { name: 'Student' })).not.toBeInTheDocument()
  })

  /*
   * The whole point of the pair. Tapping Teacher used to be the entire authentication, and
   * a child two taps away from Land and Stop.
   */
  it('will not let a wrong PIN through to the Teacher board', async () => {
    setTeacherPin('4821')
    render(<EnterPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Teacher' }))
    fireEvent.change(screen.getByLabelText('Teacher PIN'), { target: { value: '1111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))

    expect(screen.getByRole('alert')).toHaveTextContent('That is not the PIN.')
    expect(readBoardRole()).toBeNull()
    expect(replace).not.toHaveBeenCalled()
  })

  it('lets the right PIN through', async () => {
    setTeacherPin('4821')
    render(<EnterPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Teacher' }))
    fireEvent.change(screen.getByLabelText('Teacher PIN'), { target: { value: '4821' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))

    expect(readBoardRole()).toBe('teacher')
    expect(replace).toHaveBeenCalledWith('/mission')
  })

  /*
   * First morning. A door that demanded a PIN nobody had set would lock a Teacher out of
   * their own laptop, and one that waved them through would leave the hole open.
   */
  it('asks the first Teacher through to choose a PIN', async () => {
    render(<EnterPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Teacher' }))
    expect(
      screen.getByRole('heading', { name: 'Choose a four digit PIN' }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Choose a four digit PIN'), {
      target: { value: '9042' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))

    expect(readBoardRole()).toBe('teacher')
    expect(window.localStorage.getItem(TEACHER_PIN_KEY)).not.toBeNull()
  })

  it('checks the classroom code before it lets a Student in', async () => {
    openClassroom({
      code: 'K7M2',
      lessonId: null,
      lessonLabel: 'Year 6',
      scenarioId: null,
      scenarioName: '',
      objective: '',
      rules: [],
      limitMinutes: 20,
      zones: [],
    })

    render(<EnterPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Student' }))

    fireEvent.change(screen.getByLabelText('Classroom code'), { target: { value: 'ZZZZ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(readBoardRole()).toBeNull()

    fireEvent.change(screen.getByLabelText('Classroom code'), { target: { value: 'k7m2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))
    await act(async () => {
      await Promise.resolve()
    })
    expect(readBoardRole()).toBe('student')
    expect(replace).toHaveBeenCalledWith('/student')
  })
})
