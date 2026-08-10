import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  joinClassroomAsStudent,
  openClassroom,
  readClassroomSession,
  resetClassroomForTests,
  takeDroneSeat,
} from '@/lib/classroom-session'
import { ClassroomSeatsPanel } from './ClassroomSeatsPanel'

/**
 * The list a Teacher glances at while they are handing aircraft out.
 *
 * Nothing here reaches an aircraft. It is who is holding what, which is a record.
 */

const twoDrones = () =>
  openClassroom({
    lessonId: 'L-1',
    lessonLabel: 'Year 6',
    scenarioId: null,
    scenarioName: '',
    objective: '',
    rules: [],
    limitMinutes: 20,
    zones: [],
    drones: [
      { droneId: 'ttf-0001', droneName: 'Drone 1', number: 1 },
      { droneId: 'ttf-0002', droneName: 'Drone 2', number: 2 },
    ],
  })

beforeEach(resetClassroomForTests)
afterEach(resetClassroomForTests)

describe('who is on which Drone', () => {
  it('says so before a Mission is planned, rather than showing an empty list', () => {
    render(<ClassroomSeatsPanel />)
    expect(screen.getByText(/once a Mission is planned/i)).toBeInTheDocument()
  })

  it('fills itself in as children join', () => {
    const session = twoDrones()
    const joined = joinClassroomAsStudent(session, 'Amira', 1_000, 'stu-amira')
    takeDroneSeat(joined.session, 'stu-amira', 'ttf-0002')

    render(<ClassroomSeatsPanel />)

    expect(screen.getByText('Amira')).toBeInTheDocument()
    expect(screen.getByText('No Student')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 taken')
  })

  /* A broken iPad must not stop a child flying. */
  it('lets a Teacher put a child on a Drone by hand', () => {
    twoDrones()
    render(<ClassroomSeatsPanel />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Put a Student on it' })[0]!)
    fireEvent.change(screen.getByLabelText('Student on Drone 1'), { target: { value: 'Ben' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    const seat = readClassroomSession()!.seats[0]!
    expect(seat.name).toBe('Ben')
    expect(seat.droneId).toBe('ttf-0001')
  })

  /* The Teacher can see both children and the software cannot, so their change wins. */
  it('lets a Teacher rename whoever took a Drone', () => {
    const session = twoDrones()
    const joined = joinClassroomAsStudent(session, 'Amira', 1_000, 'stu-amira')
    takeDroneSeat(joined.session, 'stu-amira', 'ttf-0001')

    render(<ClassroomSeatsPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Change the name' }))
    fireEvent.change(screen.getByLabelText('Student on Drone 1'), { target: { value: 'Ola' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(readClassroomSession()!.seats.map((seat) => seat.name)).toEqual(['Ola'])
  })

  it('frees a Drone in one tap so the next child can take it', () => {
    const session = twoDrones()
    const joined = joinClassroomAsStudent(session, 'Amira', 1_000, 'stu-amira')
    takeDroneSeat(joined.session, 'stu-amira', 'ttf-0001')

    render(<ClassroomSeatsPanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Free it' }))

    expect(readClassroomSession()!.seats).toHaveLength(0)
    expect(screen.getAllByText('No Student')).toHaveLength(2)
  })
})
