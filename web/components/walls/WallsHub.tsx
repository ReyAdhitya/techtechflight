'use client'

import Link from 'next/link'
import { WallsShell } from './WallsShell'

/** Everyday walls — open from the hub without hunting. */
export const WALL_DESTINATIONS = [
  { href: '/walls/cameras', label: 'Cameras', hint: 'Every fitted camera at once' },
  { href: '/walls/status', label: 'Status', hint: 'Status, battery, and height per Drone' },
  { href: '/walls/ready', label: 'Ready', hint: 'Who is ready to fly' },
  { href: '/walls/battery', label: 'Battery', hint: 'Charge across the class' },
  { href: '/walls/attention', label: 'Attention', hint: 'Who needs you right now' },
  { href: '/walls/height', label: 'Height', hint: 'Aligned heights across the class' },
] as const

/** Less-used walls — still reachable, not competing for the first glance. */
export const MORE_WALL_DESTINATIONS = [
  { href: '/walls/faults', label: 'Faults', hint: 'Fault and stale craft first' },
  { href: '/walls/heartbeat', label: 'Heartbeat', hint: 'Alive or quiet at a glance' },
  { href: '/walls/proximity', label: 'Proximity', hint: 'Close pairs in the classroom' },
  { href: '/walls/landing', label: 'Landing', hint: 'Who is coming down' },
  { href: '/walls/pads', label: 'Pads', hint: 'QR landing targets seen or not' },
  { href: '/walls/detect', label: 'Detect', hint: 'Detection counts across the class' },
  { href: '/walls/dual', label: 'Dual', hint: 'Two cameras side by side' },
  { href: '/walls/spotlight', label: 'Spotlight', hint: 'One large camera plus thumbs' },
  { href: '/walls/landed', label: 'Landed', hint: 'Who is down at end of lesson' },
] as const

function WallLink({
  href,
  label,
  hint,
}: {
  readonly href: string
  readonly label: string
  readonly hint: string
}) {
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
  return (
    <WallsShell
      hideBack
      title="Walls"
      description="See the whole class at once — pick a wall for the glance you need."
    >
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[30rem]:grid-cols-2">
        {WALL_DESTINATIONS.map((wall) => (
          <li key={wall.href}>
            <WallLink {...wall} />
          </li>
        ))}
      </ul>

      <details className="rounded-surface border border-hairline bg-surface-1 open:pb-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-display text-body font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-ink-muted" aria-hidden="true">
            ▸
          </span>
          More walls
          <span className="tnum label rounded-pill border border-hairline px-2 py-0.5 text-ink-subtle">
            {MORE_WALL_DESTINATIONS.length}
          </span>
        </summary>
        <ul className="m-0 grid list-none grid-cols-1 gap-3 border-t border-hairline p-4 pt-3 min-[30rem]:grid-cols-2">
          {MORE_WALL_DESTINATIONS.map((wall) => (
            <li key={wall.href}>
              <WallLink {...wall} />
            </li>
          ))}
        </ul>
      </details>
    </WallsShell>
  )
}
