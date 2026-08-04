import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  assignStudent as logbookAssignStudent,
  clearLogbook,
  readLogbook,
  registerStudent,
} from './logbook'
import {
  addStudentToTeam,
  assignDroneToTeam,
  clearTeams,
  createTeam,
  readTeams,
  removeStudentFromTeam,
  removeTeam,
  renameTeam,
  studentsNotOnTeams,
  teamForStudent,
  TEAMS_KEY,
} from './teams'

beforeEach(() => {
  clearTeams()
  clearLogbook()
})

afterEach(() => {
  clearTeams()
  clearLogbook()
})

describe('teams storage', () => {
  it('starts with no teams', () => {
    expect(readTeams()).toEqual([])
  })

  it('creates a named team and persists it', () => {
    const teams = createTeam('Alpha')
    expect(teams).toEqual([{ id: 'team-1', name: 'Alpha', studentIds: [], droneId: null }])
    expect(readTeams()).toEqual(teams)
    expect(JSON.parse(window.localStorage.getItem(TEAMS_KEY)!)).toEqual(teams)
  })

  it('rejects blank team names', () => {
    expect(createTeam('   ')).toBeNull()
    expect(readTeams()).toEqual([])
  })

  it('renames a team', () => {
    createTeam('Alpha')
    const teams = renameTeam('team-1', 'Bravo crew')
    expect(teams).toEqual([{ id: 'team-1', name: 'Bravo crew', studentIds: [], droneId: null }])
  })

  it('adds a student to one team and moves them off another', () => {
    createTeam('Alpha')
    createTeam('Bravo')
    const priya = registerStudent('Priya')!
    const ravi = registerStudent('Ravi')!

    addStudentToTeam('team-1', priya)
    addStudentToTeam('team-2', ravi)
    addStudentToTeam('team-2', priya)

    expect(readTeams()).toEqual([
      { id: 'team-1', name: 'Alpha', studentIds: [], droneId: null },
      { id: 'team-2', name: 'Bravo', studentIds: [ravi, priya], droneId: null },
    ])
    expect(teamForStudent(readTeams(), priya)?.id).toBe('team-2')
  })

  it('removes a student from a team', () => {
    createTeam('Alpha')
    const priya = registerStudent('Priya')!
    addStudentToTeam('team-1', priya)
    removeStudentFromTeam('team-1', priya)
    expect(readTeams()[0]?.studentIds).toEqual([])
  })

  it('assigns one drone per team and clears duplicates', () => {
    createTeam('Alpha')
    createTeam('Bravo')
    assignDroneToTeam('team-1', 'ttf-0001')
    assignDroneToTeam('team-2', 'ttf-0001')

    expect(readTeams()).toEqual([
      { id: 'team-1', name: 'Alpha', studentIds: [], droneId: null },
      { id: 'team-2', name: 'Bravo', studentIds: [], droneId: 'ttf-0001' },
    ])
  })

  it('clears a team drone with null', () => {
    createTeam('Alpha')
    assignDroneToTeam('team-1', 'ttf-0001')
    assignDroneToTeam('team-1', null)
    expect(readTeams()[0]?.droneId).toBeNull()
  })

  it('drops a team from the list', () => {
    createTeam('Alpha')
    createTeam('Bravo')
    removeTeam('team-1')
    expect(readTeams()).toEqual([{ id: 'team-2', name: 'Bravo', studentIds: [], droneId: null }])
  })

  it('lists roster students not yet on a team', () => {
    createTeam('Alpha')
    const priya = registerStudent('Priya')!
    registerStudent('Ravi')
    addStudentToTeam('team-1', priya)
    expect(studentsNotOnTeams(readTeams(), readLogbook().roster.map((s) => s.studentId))).toEqual([
      readLogbook().roster.find((s) => s.name === 'Ravi')!.studentId,
    ])
  })

  it('does not change Logbook student assignments', () => {
    registerStudent('Priya')
    logbookAssignStudent('ttf-0001', 'Priya')
    createTeam('Alpha')
    addStudentToTeam('team-1', readLogbook().roster[0]!.studentId)
    assignDroneToTeam('team-1', 'ttf-0002')

    expect(readLogbook().students).toEqual({
      'ttf-0001': readLogbook().roster[0]!.studentId,
    })
  })
})
