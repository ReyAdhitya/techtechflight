'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Where a Teacher can go.
 *
 * ADR-0004 argued against navigation when the Fleet was the whole product and lived on
 * one screen — tabs for a single destination promise sub-screens nobody will find. That
 * reasoning holds and this is what changed: there are genuinely four other places to be,
 * each answering a question the board cannot.
 *
 * Five, ordered by a Teacher's day rather than alphabetically: Control while a lesson
 * runs, Fleet and Lesson and Students before one, Reports after. Settings is not here —
 * it is a room-and-records screen rather than a place in the workflow, so it sits in the
 * header.
 *
 * The Fleet remains the default landing screen. A Teacher who only ever wants "which
 * Drones can I hand out" never has to learn the rest, which is the part of ADR-0004's
 * reasoning that never stopped applying.
 */
export const DESTINATIONS = [
  { href: '/control', label: 'Control', hint: 'The Flight Control Center — the lesson as it runs' },
  { href: '/', label: 'Fleet', hint: 'Every Drone, and what needs doing to it' },
  { href: '/lesson', label: 'Lesson', hint: 'Plan it, then start it' },
  { href: '/students', label: 'Students', hint: 'The class, and Drone assignment' },
  { href: '/reports', label: 'Reports', hint: 'What happened, and which Drone keeps doing it' },
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
                /*
                 * Nothing to prefetch. A static export has no RSC payload behind a route,
                 * so every prefetch asked for one, got HTML, and aborted — six wasted
                 * requests on every screen, and a console full of them on a projector in
                 * front of a class. Turning it off costs nothing: none of it was ever
                 * being cached.
                 */
                prefetch={false}
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
