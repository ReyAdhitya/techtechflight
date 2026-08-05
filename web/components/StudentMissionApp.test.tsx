import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  openClassroom,
  resetClassroomForTests,
  writeStudentSeatLocal,
} from '@/lib/classroom-session'
import { BOARD_ROLE_KEY } from '@/lib/role'
import { StudentMissionApp } from './StudentMissionApp'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

beforeEach(() => {
  resetClassroomForTests()
  window.localStorage.setItem(BOARD_ROLE_KEY, 'student')
})

afterEach(() => {
  resetClassroomForTests()
})

describe('Student Mission app', () => {
  it('asks for the classroom code before joining', () => {
    render(<StudentMissionApp />)
    expect(screen.getByRole('heading', { name: /Join your class/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('ABCD')).toBeInTheDocument()
  })

  it('walks a joined Student to request takeoff', async () => {
    const user = userEvent.setup()
    const session = openClassroom({
      code: 'ABCD',
      lessonId: 'lesson-1',
      lessonLabel: 'Year 8',
      scenarioId: 'search-rescue',
      scenarioName: 'Search and Rescue',
      objective: 'Find the target.',
      rules: ['Stay inside'],
      limitMinutes: 15,
      zones: [],
      live: true,
    })
    writeStudentSeatLocal({ code: 'ABCD', studentId: 'stu-1', name: 'Ada' })
    // Seed a seat matching the local id by joining through storage shape.
    const withSeat = {
      ...session,
      seats: [
        {
          studentId: 'stu-1',
          name: 'Ada',
          droneId: null,
          droneName: null,
          phase: 'briefing' as const,
          takeoffRequestedAt: null,
          clearedAt: null,
          heldAt: null,
          checkpointIndex: 0,
          score: null,
          joinedAt: 1,
        },
      ],
    }
    window.localStorage.setItem('techtechflight:classroom-session', JSON.stringify(withSeat))

    render(<StudentMissionApp />)

    expect(screen.getByRole('heading', { name: /Receive Mission briefing/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /I have the brief/i }))
    await user.click(screen.getByRole('button', { name: /I understand/i }))
    await user.click(screen.getByRole('button', { name: /Craft ready/i }))
    await user.click(screen.getByRole('button', { name: /Continue/i }))
    expect(screen.getByRole('button', { name: /Request takeoff/i })).toBeInTheDocument()
  })
})
