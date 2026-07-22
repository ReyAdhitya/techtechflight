'use client'

import { useState } from 'react'
import { isUsable, type DroneState } from '@techtechflight/contract'
import {
  assignStudent,
  rememberStudent,
  serviceStateOf,
  studentOf,
  type Logbook,
} from '@/lib/logbook'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { cn } from '@/lib/utils'

/**
 * Who flies what, entered the way a Teacher actually enters it.
 *
 * A column of Drones in board order with a name beside each, so the muscle memory built
 * on the Fleet screen transfers and Tab walks straight down the class. Names complete from
 * the ones already used. Six of these get filled in during the thirty seconds before a
 * lesson starts, and that is the constraint the design answers to.
 *
 * Deliberately not drag and drop: hostile on a touch screen, slow with a keyboard, and
 * wrong for someone standing at a podium with a class arriving.
 */
export function AssignmentColumn({
  drones,
  book,
}: {
  readonly drones: readonly DroneState[]
  readonly book: Logbook
}) {
  const assigned = drones.filter((drone) => studentOf(book, drone.id) !== null)
  const ready = drones.filter(
    (drone) => isUsable(drone.status) && serviceStateOf(book, drone.id) !== 'out-of-service',
  )
  const shortfall = assigned.length - ready.length

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="label m-0">Who flies what</h2>
        {shortfall > 0 && (
          <p className="m-0 text-value text-status-not-ready">
            {assigned.length} Students, {ready.length} ready to hand out.
          </p>
        )}
      </div>

      {/* Completes from names already used, so a class is typed once a term. */}
      <datalist id="class-names">
        {book.roll.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {drones.map((drone) => (
          <AssignmentRow key={drone.id} drone={drone} book={book} drones={drones} />
        ))}
      </ul>
    </section>
  )
}

function AssignmentRow({
  drone,
  book,
  drones,
}: {
  drone: DroneState
  book: Logbook
  drones: readonly DroneState[]
}) {
  const student = studentOf(book, drone.id)
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? student ?? ''
  const service = serviceStateOf(book, drone.id)

  /*
   * One Drone to one Student. Prevented at the moment of entry rather than reported
   * afterwards, because the Teacher is looking at exactly this row when it happens and
   * will not be looking at a summary later.
   */
  const clash = drones.find(
    (other) => other.id !== drone.id && studentOf(book, other.id) === value.trim() && value.trim() !== '',
  )

  const commit = () => {
    if (draft === null) return
    if (clash) {
      setDraft(null)
      return
    }
    assignStudent(drone.id, draft)
    rememberStudent(draft)
    setDraft(null)
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <label className="flex items-center gap-3">
        <span className="w-24 font-display text-value font-medium text-ink">{drone.name}</span>
        <span className="visually-hidden">Who is flying {drone.name}</span>
        <input
          value={value}
          list="class-names"
          placeholder="Add a name"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          className={cn(
            'min-h-11 w-36 rounded-pill border bg-canvas px-3 py-1 text-value',
            student ? 'border-hairline text-ink' : 'border-dashed border-hairline text-ink-muted',
          )}
        />
      </label>

      {clash && (
        <span className="text-value text-status-not-ready">
          {clash.name} is already assigned to {value.trim()}.
        </span>
      )}
      {!clash && service === 'out-of-service' && (
        <span className="text-value text-status-fault">
          You have taken this one out of service.
        </span>
      )}
      {!clash && service !== 'out-of-service' && !isUsable(drone.status) && (
        <span
          className={cn(
            'text-value',
            drone.status === 'Fault' ? 'text-status-fault' : 'text-ink-subtle',
          )}
        >
          {STATUS_PRESENTATION[drone.status].label}
        </span>
      )}
    </li>
  )
}
