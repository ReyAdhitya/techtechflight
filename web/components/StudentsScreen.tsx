'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  clearStudents,
  readLogbook,
  readServerLogbook,
  saveRoll,
  studentOf,
  subscribeLogbook,
} from '@/lib/logbook'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { cn } from '@/lib/utils'
import { useFleet } from './FleetProvider'
import { StatusGlyph } from './StatusBadge'

/**
 * The class, and who is flying what.
 *
 * **This screen records Drones, never children.** A Student is shown which Drone they have
 * and which Lessons they have flown in, and nothing else — no incidents, no faults, no
 * accumulating history against a named child.
 *
 * The reason is both factual and ethical. A Drone that faulted did not fault because of
 * whose hands were on the controller, so a record implying otherwise is simply wrong. And
 * a system that quietly builds a failure history against a named child in a school is not
 * something to construct as a side effect of adding an assignment feature. If it is ever
 * wanted it is a deliberate decision with a safeguarding conversation attached.
 */
export function StudentsScreen() {
  const { snapshot } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const drones = snapshot.state?.drones ?? []
  const [adding, setAdding] = useState('')

  const flying = drones.filter((drone) => studentOf(book, drone.id) !== null)

  return (
    <main
      id="content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4 min-[26rem]:p-8"
    >
      <h1 className="m-0 font-display text-summary font-medium">Students</h1>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2 className="label m-0">Flying now</h2>
          {flying.length > 0 && (
            <button
              type="button"
              onClick={clearStudents}
              className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
            >
              Everyone has put theirs down
            </button>
          )}
        </div>

        {flying.length === 0 ? (
          <p className="m-0 text-value text-ink-subtle">
            Nobody has a Drone yet. Hand them out from the Lesson screen.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {flying.map((drone) => (
              <li
                key={drone.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-surface border border-hairline bg-surface-1 p-3"
              >
                <span className="font-display text-body font-medium text-ink">
                  {studentOf(book, drone.id)}
                </span>
                <Link
                  href={`/drone?id=${encodeURIComponent(drone.id)}`}
                  className="text-value text-ink no-underline hover:underline"
                >
                  {drone.name}
                </Link>
                <span
                  className={cn(
                    'inline-flex items-center gap-2 text-value',
                    drone.status === 'Fault'
                      ? 'text-status-fault'
                      : drone.status === 'Not Ready'
                        ? 'text-status-not-ready'
                        : 'text-ink-subtle',
                  )}
                >
                  <StatusGlyph shape={STATUS_PRESENTATION[drone.status].shape} />
                  {STATUS_PRESENTATION[drone.status].label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-hairline pt-6">
        <div className="flex flex-col gap-1">
          <h2 className="label m-0">The class</h2>
          <p className="m-0 text-value text-ink-subtle">
            Kept so you type a class once rather than once a period. Names are all this
            board stores about a Student — nothing is recorded against them.
          </p>
        </div>

        {book.roll.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {book.roll.map((name) => (
              <li key={name}>
                <span className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-hairline px-3 py-1 text-value text-ink">
                  {name}
                  <button
                    type="button"
                    aria-label={`Remove ${name} from the class`}
                    onClick={() => saveRoll(book.roll.filter((other) => other !== name))}
                    className="cursor-pointer border-0 bg-transparent text-value text-ink-muted hover:text-ink"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="label">Add a name</span>
            <input
              value={adding}
              onChange={(event) => setAdding(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                saveRoll([...book.roll, adding])
                setAdding('')
              }}
              className="min-h-11 w-48 rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              saveRoll([...book.roll, adding])
              setAdding('')
            }}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          >
            Add
          </button>
        </div>
      </section>
    </main>
  )
}
