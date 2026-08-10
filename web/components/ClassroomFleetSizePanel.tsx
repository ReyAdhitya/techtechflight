'use client'

import { useEffect, useState } from 'react'
import {
  COMFORTABLE_BOARD_SIZE,
  UNSUPERVISABLE_SIZE,
  readClassroomFleetSize,
  writeClassroomFleetSize,
} from '@/lib/classroom-fleet-size'
import { useFleet } from './FleetProvider'

/**
 * How many Drones are in the set.
 *
 * **No cap.** There was one, twenty, a constant in `classroom-fleet.ts` with nothing behind
 * it: no screen breaks at twenty-one. Software that refused the Drone a school had just
 * bought would be telling a Teacher their classroom is wrong.
 *
 * What the board owes them instead is honesty about what it can draw. Six is comfortable,
 * twenty is full and readable, fifty scrolls off the screen and two hundred is more aircraft
 * than one adult can supervise. The number is taken either way; the sentence beside it says
 * which of those they have asked for.
 *
 * The simulated Fleet only. A ground station registers the school's own hardware, and a
 * number typed in a browser must never look as though it put an aircraft in a room.
 */
export function ClassroomFleetSizePanel() {
  const { demo } = useFleet()
  const [size, setSize] = useState(0)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const current = readClassroomFleetSize()
    setSize(current)
    setDraft(String(current))
  }, [])

  if (!demo) {
    return (
      <section className="flex flex-col gap-2 rounded-surface border border-hairline bg-surface-1 p-5">
        <h2 className="label m-0">How many Drones</h2>
        <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
          The ground station registers the set this school actually owns. There is no limit on
          it, and it is not changed from here: a number typed in a browser must never look
          like an aircraft appearing in a room.
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">How many Drones</h2>
        <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
          The simulated set. As many as you like, and it takes effect on the next reading.
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const next = Number.parseInt(draft, 10)
          if (!writeClassroomFleetSize(next)) return
          setSize(next)
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="label">Drones in the set</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="tnum min-h-11 w-28 rounded-pill border border-hairline bg-canvas px-3 text-value text-ink"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Use this many
        </button>
      </form>

      <p className="m-0 max-w-[62ch] text-value text-ink-subtle" role="status">
        {size === 0
          ? 'Reading the set.'
          : size <= COMFORTABLE_BOARD_SIZE
            ? `${size} on the board. Every strip fits.`
            : size < UNSUPERVISABLE_SIZE
              ? `${size} on the board. The strips are a dense list from ${COMFORTABLE_BOARD_SIZE} up, and you will scroll.`
              : `${size} on the board. That is more aircraft than one adult can supervise, and the board says so rather than refusing.`}
      </p>
    </section>
  )
}
