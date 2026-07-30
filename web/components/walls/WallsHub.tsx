'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { WallsShell } from './WallsShell'

/** Every Classroom Wall linked from the hub, in a fixed glance order. */
export const WALL_DESTINATIONS = [
  { href: '/walls/cameras', label: 'Cameras', hint: 'Every fitted camera at once' },
  { href: '/walls/status', label: 'Status', hint: 'Status, battery, and height per Drone' },
  { href: '/walls/ready', label: 'Ready', hint: 'Who is ready to fly' },
  { href: '/walls/battery', label: 'Battery', hint: 'Charge across the class' },
  { href: '/walls/attention', label: 'Attention', hint: 'Who needs you right now' },
  { href: '/walls/height', label: 'Height', hint: 'Aligned heights across the class' },
  { href: '/walls/faults', label: 'Faults', hint: 'Fault and stale craft first' },
  { href: '/walls/heartbeat', label: 'Heartbeat', hint: 'Alive or quiet at a glance' },
  { href: '/walls/proximity', label: 'Proximity', hint: 'Close pairs in the classroom' },
  { href: '/walls/landing', label: 'Landing', hint: 'Who is coming down' },
  { href: '/walls/pads', label: 'Pads', hint: 'QR landing targets seen or not' },
  { href: '/walls/detect', label: 'Detect', hint: 'Detection counts across the class' },
  { href: '/walls/dual', label: 'Dual', hint: 'Two cameras side by side' },
  { href: '/walls/landed', label: 'Landed', hint: 'Who is down at end of lesson' },
] as const

export type WallDestination = (typeof WALL_DESTINATIONS)[number]

function matchesQuery(wall: WallDestination, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return true
  return (
    wall.label.toLowerCase().includes(q) ||
    wall.hint.toLowerCase().includes(q) ||
    wall.href.toLowerCase().includes(q)
  )
}

function WallLink({ href, label, hint }: WallDestination) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex flex-col gap-1 rounded-sm border border-hairline bg-surface-1 p-4 text-ink no-underline transition-colors hover:border-ink-subtle"
    >
      <span className="font-display text-body font-medium">{label}</span>
      <span className="text-caption text-ink-subtle">{hint}</span>
    </Link>
  )
}

export function WallsHub() {
  const [query, setQuery] = useState('')
  const walls = useMemo(
    () => WALL_DESTINATIONS.filter((wall) => matchesQuery(wall, query)),
    [query],
  )

  return (
    <WallsShell
      hideBack
      title="Walls"
      description="See the whole class at once — pick a wall for the glance you need."
    >
      <label className="flex flex-col gap-2">
        <span className="label m-0">Find a wall</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search walls…"
          autoComplete="off"
          className="min-h-11 w-full rounded-surface border border-hairline bg-surface-1 px-4 py-2 font-display text-body text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        />
      </label>

      {walls.length === 0 ? (
        <p className="m-0 text-body text-ink-muted">No walls match “{query.trim()}”.</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[30rem]:grid-cols-2">
          {walls.map((wall) => (
            <li key={wall.href}>
              <WallLink {...wall} />
            </li>
          ))}
        </ul>
      )}
    </WallsShell>
  )
}
