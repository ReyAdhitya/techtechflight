'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Where a Teacher can go that is not part of the Mission run, behind one button.
 *
 * This used to be seven links, always open, across the top of every screen. Beside the
 * twelve-step rail that is two navigations on one screen, and a Teacher glancing up has to
 * work out which of them they are being asked to read. ADR-0026 collapses this one, because
 * the rail is the one that knows where they are.
 *
 * Lesson, Control and Reports have left on purpose: they are steps now, and the rail is how
 * a Teacher reaches them. What is left is the four places that answer a question the Mission
 * run does not. Fleet is "can I hand this out", Walls is the whole class at once on a
 * projector, Students is the class and who flies what, Vision is whether this machine can
 * see. None of them is somewhere a Teacher goes mid-Mission, which is exactly why one press
 * to open is a fair price for the width.
 *
 * Settings is still not here, and still sits in the header on its own control: it is the
 * room and the records rather than a place in the workflow.
 */
export const DESTINATIONS = [
  { href: '/', label: 'Fleet', hint: 'Every Drone, and what needs doing to it' },
  { href: '/walls', label: 'Walls', hint: 'See the whole class at once' },
  { href: '/students', label: 'Students', hint: 'The class, and Drone assignment' },
  { href: '/vision', label: 'Vision', hint: 'Whether the camera and the model actually work' },
] as const

/**
 * The Mission run, for the command palette only.
 *
 * Not in the button, because the rail is how a Teacher walks the twelve steps and a second
 * way in beside it is the restatement this change removes. `Ctrl` + `K` is invisible until
 * it is asked for, so it can carry the whole board without crowding anything.
 */
export const MISSION_RUN_DESTINATION = {
  href: '/mission',
  label: 'Mission run',
  hint: 'The twelve steps, from the Scenario to the debrief',
} as const

export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const navRef = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  /*
   * Escape puts the focus back on the button rather than dropping it on the document. A
   * Teacher who opened this from the keyboard and shut it again has nowhere to be
   * otherwise, and the next Tab would start from the top of the page.
   */
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && navRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <nav className="site-nav" aria-label="Sections" ref={navRef}>
      <button
        ref={buttonRef}
        type="button"
        className="site-nav__button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M2 4h12M2 8h12M2 12h12" />
        </svg>
        Go to
      </button>

      {/*
       * `hidden` rather than unmounted, so the button's `aria-controls` always points at
       * something. The stylesheet has to say `display: none` for it explicitly, because a
       * `display: flex` rule beats the attribute's own default.
       */}
      <ul id={menuId} className="site-nav__list" hidden={!open}>
        {DESTINATIONS.map((destination) => {
          /*
           * The Fleet is reachable at two paths: `/` when a ground station is serving
           * the board, and `/demo` on a deploy that has none. Both are the same screen
           * and both should light up the same link.
           */
          const active =
            destination.href === '/'
              ? pathname === '/' || pathname === '/demo'
              : pathname === destination.href || pathname.startsWith(`${destination.href}/`)

          return (
            <li key={destination.href}>
              <Link
                href={destination.href}
                /*
                 * Nothing to prefetch. A static export has no RSC payload behind a route,
                 * so every prefetch asked for one, got HTML, and aborted: wasted requests
                 * on every screen, and a console full of them on a projector in front of a
                 * class. Turning it off costs nothing, because none of it was ever cached.
                 */
                prefetch={false}
                className={cn('site-nav__link', active && 'site-nav__link--active')}
                aria-current={active ? 'page' : undefined}
                title={destination.hint}
                onClick={() => setOpen(false)}
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
