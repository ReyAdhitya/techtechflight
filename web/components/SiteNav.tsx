'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Where a Teacher can go.
 *
 * ADR-0004 argued against navigation when the Fleet was the whole product and lived on
 * one screen — tabs for a single destination promise sub-screens nobody will find. That
 * reasoning holds and this is what changed: there are now genuinely four other places to
 * be, each answering a question the board cannot. The board stays first and stays the
 * default, so a Teacher who only ever wants "which Drones can I hand out" never has to
 * learn the rest.
 */
export const DESTINATIONS = [
  { href: '/', label: 'Fleet', hint: 'Every Drone, right now' },
  { href: '/control', label: 'Control', hint: 'The Flight Control Center — the lesson as it runs' },
  { href: '/lesson', label: 'Lesson', hint: 'Pre-flight check, then run the lesson' },
  { href: '/students', label: 'Students', hint: 'The class, and who is flying what' },
  { href: '/history', label: 'History', hint: 'What has happened today' },
  { href: '/maintenance', label: 'Maintenance', hint: 'What needs doing, and to which Drone' },
  { href: '/settings', label: 'Settings', hint: 'Connection, appearance, and your records' },
] as const

export function SiteNav() {
  const pathname = usePathname()

  return (
    <nav className="site-nav" aria-label="Sections">
      <ul className="site-nav__list">
        {DESTINATIONS.map((destination) => {
          /*
           * The Fleet is reachable at two paths: `/` when a ground station is serving
           * the board, and `/demo` on a deploy that has none. Both are the same screen
           * and both should light up the same link.
           */
          const active =
            destination.href === '/'
              ? pathname === '/' || pathname === '/demo'
              : pathname === destination.href

          return (
            <li key={destination.href}>
              <Link
                href={destination.href}
                className={cn('site-nav__link', active && 'site-nav__link--active')}
                aria-current={active ? 'page' : undefined}
                title={destination.hint}
              >
                {destination.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
