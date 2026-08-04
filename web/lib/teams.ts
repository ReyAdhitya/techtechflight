import type { DroneId } from '@techtechflight/contract'

/**
 * Mission teams — named groups of Students sharing one craft.
 *
 * Teams sit beside the Logbook's Student→Drone assignments; they do not replace them.
 * A team record says who works together and which Drone the team owns for the Mission.
 * Local first (ADR-0005); never Telemetry (ADR-0011).
 */

export const TEAMS_KEY = 'techtechflight:teams'

export interface Team {
  readonly id: string
  readonly name: string
  readonly studentIds: readonly string[]
  readonly droneId: DroneId | null
}

function nextTeamId(teams: readonly Team[]): string {
  let n = teams.length + 1
  while (teams.some((team) => team.id === `team-${n}`)) n += 1
  return `team-${n}`
}

function parseTeam(value: unknown): Team | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Partial<Team>
  if (typeof row.id !== 'string' || row.id.trim() === '') return null
  if (typeof row.name !== 'string' || row.name.trim() === '') return null
  const studentIds: string[] = []
  if (Array.isArray(row.studentIds)) {
    for (const id of row.studentIds) {
      if (typeof id === 'string' && id.trim() !== '' && !studentIds.includes(id)) {
        studentIds.push(id)
      }
    }
  }
  const droneId =
    row.droneId === null || row.droneId === undefined
      ? null
      : typeof row.droneId === 'string' && row.droneId.trim() !== ''
        ? row.droneId
        : null
  return { id: row.id, name: row.name.trim(), studentIds, droneId }
}

function load(): readonly Team[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(TEAMS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const teams: Team[] = []
    for (const row of parsed) {
      const team = parseTeam(row)
      if (team !== null && !teams.some((existing) => existing.id === team.id)) teams.push(team)
    }
    return teams
  } catch {
    return []
  }
}

function persist(teams: readonly Team[]): readonly Team[] {
  if (typeof window === 'undefined') return teams
  try {
    window.localStorage.setItem(TEAMS_KEY, JSON.stringify(teams))
  } catch {
    /* memory only on locked-down browsers */
  }
  return teams
}

/** All Mission teams in this browser. */
export function readTeams(): readonly Team[] {
  return load()
}

/** Name a new team and append it to the list. Returns null when the name is blank. */
export function createTeam(name: string): readonly Team[] | null {
  const trimmed = name.trim()
  if (trimmed === '') return null
  const teams = [...readTeams(), { id: nextTeamId(readTeams()), name: trimmed, studentIds: [], droneId: null }]
  return persist(teams)
}

/** Rename one team. Returns null when the name is blank or the team is missing. */
export function renameTeam(teamId: string, name: string): readonly Team[] | null {
  const trimmed = name.trim()
  if (trimmed === '') return null
  const teams = readTeams()
  const index = teams.findIndex((team) => team.id === teamId)
  if (index === -1) return null
  const next = teams.map((team, i) => (i === index ? { ...team, name: trimmed } : team))
  return persist(next)
}

/**
 * Put a Student on a team. Removes them from any other team first — one team per Student.
 * Returns null when the team or student id is missing.
 */
export function addStudentToTeam(teamId: string, studentId: string): readonly Team[] | null {
  const id = studentId.trim()
  if (id === '') return null
  const teams = readTeams()
  if (!teams.some((team) => team.id === teamId)) return null
  const next = teams.map((team) => {
    if (team.id === teamId) {
      if (team.studentIds.includes(id)) return team
      return { ...team, studentIds: [...team.studentIds, id] }
    }
    return { ...team, studentIds: team.studentIds.filter((member) => member !== id) }
  })
  return persist(next)
}

/** Remove a Student from one team. No-op when they were not on it. */
export function removeStudentFromTeam(teamId: string, studentId: string): readonly Team[] {
  const id = studentId.trim()
  if (id === '') return readTeams()
  const next = readTeams().map((team) =>
    team.id === teamId
      ? { ...team, studentIds: team.studentIds.filter((member) => member !== id) }
      : team,
  )
  return persist(next)
}

/**
 * Give a team a Drone, or clear with null. One Drone per team — assigning clears other teams.
 * Returns null when the team is missing.
 */
export function assignDroneToTeam(teamId: string, droneId: DroneId | null): readonly Team[] | null {
  const teams = readTeams()
  if (!teams.some((team) => team.id === teamId)) return null
  const nextDrone =
    droneId === null || droneId.trim() === '' ? null : (droneId.trim() as DroneId)
  const next = teams.map((team) => {
    if (team.id === teamId) return { ...team, droneId: nextDrone }
    if (nextDrone !== null && team.droneId === nextDrone) return { ...team, droneId: null }
    return team
  })
  return persist(next)
}

/** Drop one team from the list. */
export function removeTeam(teamId: string): readonly Team[] {
  return persist(readTeams().filter((team) => team.id !== teamId))
}

/** Which team a Student belongs to, if any. */
export function teamForStudent(teams: readonly Team[], studentId: string): Team | null {
  return teams.find((team) => team.studentIds.includes(studentId)) ?? null
}

/** Roster studentIds not yet placed on any team. */
export function studentsNotOnTeams(
  teams: readonly Team[],
  rosterStudentIds: readonly string[],
): readonly string[] {
  const placed = new Set(teams.flatMap((team) => team.studentIds))
  return rosterStudentIds.filter((id) => !placed.has(id))
}

/** Test helper — clears teams without touching the Logbook. */
export function clearTeams(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(TEAMS_KEY)
    } catch {
      /* ignore */
    }
  }
}
