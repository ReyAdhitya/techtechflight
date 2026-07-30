'use client'

import Link from 'next/link'
import { WallsShell } from './WallsShell'

/** Links every Classroom Wall a Teacher can open from the hub. Grow as walls land. */
export const WALL_DESTINATIONS = [
  { href: '/walls/cameras', label: 'Cameras', hint: 'Every fitted camera at once' },
  { href: '/walls/status', label: 'Status', hint: 'Status, battery, and height per Drone' },
  { href: '/walls/ready', label: 'Ready', hint: 'Who is ready to fly' },
  { href: '/walls/battery', label: 'Battery', hint: 'Charge across the class' },
] as const

export function WallsHub() {
  return (
    <WallsShell
      hideBack
      title="Walls"
      description="See the whole class at once — pick a wall for the glance you need."
    >
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[30rem]:grid-cols-2">
        {WALL_DESTINATIONS.map((wall) => (
          <li key={wall.href}>
            <Link
              href={wall.href}
              prefetch={false}
              className="flex flex-col gap-1 rounded-sm border border-hairline bg-surface-1 p-4 text-ink no-underline transition-colors hover:border-ink-subtle"
            >
              <span className="font-display text-body font-medium">{wall.label}</span>
              <span className="text-caption text-ink-subtle">{wall.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </WallsShell>
  )
}
