import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { aDroneState } from '@techtechflight/contract/fixtures'
import {
  assignStudent,
  clearLogbook,
  readLogbook,
  registerStudent,
} from '@/lib/logbook'
import { clearTeams, readTeams, TEAMS_KEY } from '@/lib/teams'
import { TeamsPanel } from './TeamsPanel'

const drones = [
  aDroneState({ id: 'ttf-0001', name: 'Drone 1' }),
  aDroneState({ id: 'ttf-0002', name: 'Drone 2' }),
]

beforeEach(() => {
  clearTeams()
  clearLogbook()
})

afterEach(() => {
  clearTeams()
  clearLogbook()
})

describe('TeamsPanel', () => {
  it('starts empty and explains teams extend individual assignments', () => {
    render(<TeamsPanel drones={drones} book={readLogbook()} />)

    expect(screen.getByRole('heading', { name: 'Mission teams' })).toBeInTheDocument()
    expect(screen.getByText(/Individual who-is-flying assignments/i)).toBeInTheDocument()
    expect(screen.getByText(/No teams yet/i)).toBeInTheDocument()
  })

  it('creates a named team from the draft field', () => {
    render(<TeamsPanel drones={drones} book={readLogbook()} />)

    fireEvent.change(screen.getByLabelText(/New team name/i), { target: { value: 'Alpha' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add team' }))

    expect(readTeams()).toEqual([{ id: 'team-1', name: 'Alpha', studentIds: [], droneId: null }])
    expect(screen.getByDisplayValue('Alpha')).toBeInTheDocument()
  })

  it('adds a roster Student and assigns a Drone without changing Logbook assignments', () => {
    registerStudent('Priya')
    assignStudent('ttf-0001', 'Priya')
    const book = readLogbook()

    render(<TeamsPanel drones={drones} book={book} />)

    fireEvent.change(screen.getByLabelText(/New team name/i), { target: { value: 'Rescue 1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add team' }))

    const teamCard = screen.getByDisplayValue('Rescue 1').closest('li')!
    fireEvent.change(within(teamCard).getByLabelText(/Add Student/i), {
      target: { value: book.roster[0]!.studentId },
    })
    fireEvent.change(within(teamCard).getByLabelText(/Team Drone/i), {
      target: { value: 'ttf-0002' },
    })

    expect(readTeams()[0]).toMatchObject({
      name: 'Rescue 1',
      studentIds: [book.roster[0]!.studentId],
      droneId: 'ttf-0002',
    })
    expect(readLogbook().students).toEqual({ 'ttf-0001': book.roster[0]!.studentId })
    expect(within(teamCard).getByText('Priya')).toBeInTheDocument()
    expect(within(teamCard).getByText(/Assigned to Drone 2/i)).toBeInTheDocument()
  })

  it('renames a team on blur', () => {
    render(<TeamsPanel drones={drones} book={readLogbook()} />)

    fireEvent.change(screen.getByLabelText(/New team name/i), { target: { value: 'Alpha' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add team' }))

    const nameInput = screen.getByLabelText(/^Team name$/i)
    fireEvent.change(nameInput, { target: { value: 'Bravo crew' } })
    fireEvent.blur(nameInput)

    expect(readTeams()[0]?.name).toBe('Bravo crew')
    expect(window.localStorage.getItem(TEAMS_KEY)).toContain('Bravo crew')
  })
})
