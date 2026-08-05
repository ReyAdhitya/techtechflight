'use client'

import { useState } from 'react'
import type { DroneState } from '@techtechflight/contract'
import type { Logbook } from '@/lib/logbook'
import { studentRecordOf } from '@/lib/logbook'
import { cn } from '@/lib/utils'
import {
  addStudentToTeam,
  assignDroneToTeam,
  createTeam,
  readTeams,
  removeStudentFromTeam,
  removeTeam,
  renameTeam,
  studentsNotOnTeams,
  type Team,
} from '@/lib/teams'

/**
 * Mission teams — named Student groups each sharing one Drone.
 *
 * Teams extend the Logbook's live Student→Drone assignments; they do not replace them.
 * Mounting stays with the Integrator; this panel takes book and Fleet rows so it can
 * render under Lesson prep without owning subscriptions.
 */
export function TeamsPanel({
  book,
  drones,
  bare = false,
}: {
  readonly book: Logbook
  readonly drones: readonly DroneState[]
  /** Drop the heading and the card, because a Mission step already carries both. */
  readonly bare?: boolean
}) {
  const [teams, setTeams] = useState<readonly Team[]>(() => readTeams())
  const [draftName, setDraftName] = useState('')
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({})

  const rosterIds = book.roster.map((student) => student.studentId)
  const unassignedIds = studentsNotOnTeams(teams, rosterIds)

  const studentName = (studentId: string): string =>
    studentRecordOf(book, studentId)?.name ?? studentId

  const droneLabel = (droneId: string): string =>
    drones.find((drone) => drone.id === droneId)?.name ?? droneId

  const refresh = (next: readonly Team[] | null) => {
    if (next !== null) setTeams(next)
  }

  const saveNewTeam = () => {
    const next = createTeam(draftName)
    if (next === null) return
    setTeams(next)
    setDraftName('')
  }

  return (
    <section
      className={cn(
        'flex flex-col gap-4',
        !bare && 'rounded-surface border border-hairline bg-surface-1 p-5',
      )}
      aria-label={bare ? 'Mission teams' : undefined}
      aria-labelledby={bare ? undefined : 'teams-panel-heading'}
    >
      {bare ? null : (
        <div className="flex flex-col gap-1">
          <h2 id="teams-panel-heading" className="label m-0">
            Mission teams
          </h2>
          <p className="m-0 text-value text-ink-subtle">
            Group Students into named teams and give each team a Drone. Individual
            who-is-flying assignments in the Logbook stay as they are — teams sit beside them
            for Mission prep.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="label">New team name</span>
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            className="min-h-11 w-48 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
          />
        </label>
        <button
          type="button"
          onClick={saveNewTeam}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Add team
        </button>
      </div>

      {teams.length === 0 ? (
        <p className="m-0 text-value text-ink-muted">No teams yet — name the first one above.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-4 p-0">
          {teams.map((team) => {
            const renameDraft = renameDrafts[team.id] ?? team.name

            return (
              <li
                key={team.id}
                className="flex flex-col gap-3 rounded-surface border border-hairline bg-canvas p-4"
              >
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                  <label className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="label">Team name</span>
                    <input
                      value={renameDraft}
                      onChange={(event) =>
                        setRenameDrafts((prev) => ({ ...prev, [team.id]: event.target.value }))
                      }
                      onBlur={() => {
                        if (renameDraft.trim() === team.name) return
                        const next = renameTeam(team.id, renameDraft)
                        if (next !== null) setTeams(next)
                      }}
                      className="min-h-11 rounded-pill border border-hairline bg-surface-1 px-3 py-1 text-value text-ink"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => refresh(removeTeam(team.id))}
                    className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
                  >
                    Remove team
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="label">Members</span>
                  {team.studentIds.length === 0 ? (
                    <p className="m-0 text-value text-ink-muted">No Students on this team yet.</p>
                  ) : (
                    <ul className="m-0 flex list-none flex-col gap-2 p-0">
                      {team.studentIds.map((studentId) => (
                        <li
                          key={studentId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-hairline bg-surface-1 px-3 py-2"
                        >
                          <span className="font-display text-value font-medium text-ink">
                            {studentName(studentId)}
                          </span>
                          <button
                            type="button"
                            onClick={() => refresh(removeStudentFromTeam(team.id, studentId))}
                            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-3 py-1 text-value text-ink-muted hover:border-ink hover:text-ink"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {book.roster.length > 0 && unassignedIds.length > 0 ? (
                    <label className="flex max-w-md flex-col gap-1">
                      <span className="label">Add Student</span>
                      <select
                        defaultValue=""
                        onChange={(event) => {
                          const studentId = event.target.value
                          if (studentId === '') return
                          refresh(addStudentToTeam(team.id, studentId))
                          event.target.value = ''
                        }}
                        className="min-h-11 rounded-pill border border-hairline bg-surface-1 px-3 py-1 text-value text-ink"
                      >
                        <option value="">Choose…</option>
                        {unassignedIds.map((studentId) => (
                          <option key={studentId} value={studentId}>
                            {studentName(studentId)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : book.roster.length === 0 ? (
                    <p className="m-0 text-value text-ink-muted">
                      Register Students on the class list before adding them to teams.
                    </p>
                  ) : null}
                </div>

                <label className="flex max-w-md flex-col gap-1">
                  <span className="label">Team Drone</span>
                  <select
                    value={team.droneId ?? ''}
                    onChange={(event) => {
                      const value = event.target.value
                      refresh(assignDroneToTeam(team.id, value === '' ? null : value))
                    }}
                    className="min-h-11 rounded-pill border border-hairline bg-surface-1 px-3 py-1 text-value text-ink"
                  >
                    <option value="">None yet</option>
                    {drones.map((drone) => (
                      <option key={drone.id} value={drone.id}>
                        {drone.name} ({drone.id})
                      </option>
                    ))}
                  </select>
                  {team.droneId !== null ? (
                    <span className="text-caption text-ink-muted">
                      Assigned to {droneLabel(team.droneId)}
                    </span>
                  ) : (
                    <span className="text-caption text-ink-muted">No craft assigned yet</span>
                  )}
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <p className="m-0 text-value text-ink-subtle">
        <span className="tnum">{teams.length}</span>
        {teams.length === 1 ? ' team' : ' teams'}
        {' · '}
        <span className="tnum">{teams.filter((team) => team.droneId !== null).length}</span>
        {' with a Drone'}
      </p>
    </section>
  )
}
