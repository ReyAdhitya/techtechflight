'use client'

import Link from 'next/link'
import { WallsShell } from './WallsShell'

/** Links every Classroom Wall a Teacher can open from the hub. Grow as walls land. */
export const WALL_DESTINATIONS = [
  { href: '/walls/cameras', label: 'Cameras', hint: 'Every fitted camera at once' },
  { href: '/walls/status', label: 'Status', hint: 'Status, battery, and height per Drone' },
  { href: '/walls/ready', label: 'Ready', hint: 'Who is ready to fly' },
  { href: '/walls/battery', label: 'Battery', hint: 'Charge across the class' },
  { href: '/walls/attention', label: 'Attention', hint: 'Who needs you right now' },
  { href: '/walls/faults', label: 'Faults', hint: 'Fault and stale craft first' },
  { href: '/walls/heartbeat', label: 'Heartbeat', hint: 'Alive or quiet at a glance' },
  { href: '/walls/height', label: 'Height', hint: 'Aligned heights across the class' },
  { href: '/walls/proximity', label: 'Proximity', hint: 'Close pairs in the classroom' },
  { href: '/walls/landing', label: 'Landing', hint: 'Who is coming down' },
  { href: '/walls/pads', label: 'Pads', hint: 'QR landing targets seen or not' },
  { href: '/walls/detect', label: 'Detect', hint: 'Detection counts across the class' },
  { href: '/walls/dual', label: 'Dual', hint: 'Two cameras side by side' },
  { href: '/walls/spotlight', label: 'Spotlight', hint: 'One large camera plus thumbs' },
  { href: '/walls/landed', label: 'Landed', hint: 'Who is down at end of lesson' },
  { href: '/walls/tv', label: 'TV', hint: 'Classroom display of Cameras or Status' },
]

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
