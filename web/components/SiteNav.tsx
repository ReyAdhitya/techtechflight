'use client'

import { useEffect, type ReactNode, type RefObject } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Where a Teacher can go, behind one button on the left of the bar.
 *
 * This used to be seven links, always open, across the top of every screen. Beside the
 * twelve-step rail that is two navigations on one screen, and a Teacher glancing up has to
 * work out which of them they are being asked to read. ADR-0026 collapses this one, because
 * the rail is the one that knows where they are.
 *
 * **Mission run is first.** It left the list when the rail returned, on the reasoning that a
 * second way in beside the rail is a restatement. That was right on the Mission run page and
 * wrong everywhere else: from Walls there was no way back to the lesson at all except
 * `Ctrl` + `K`, which does not exist on a tablet. Being stranded on a screen is worse than a
 * duplicated route.
 *
 * Lesson and Control are still not here: they are steps, and the rail is how a Teacher
 * reaches them. What follows the Mission run is the five places that answer a question one
 * Mission run does not. Fleet is "can I hand this out", Walls is the whole class at once on a
 * projector, Students is the class and who flies what, Reports is what happened across a
 * term, Vision is whether this machine can see.
 *
 * **The button is on the left, beside the logo.** Navigation in the middle of a bar reads as
 * wrong before you have noticed anything else about it.
 */
export const DESTINATIONS = [
  {
    href: '/mission',
    label: 'Mission run',
    hint: 'The twelve steps, from the Scenario to the debrief',
  },
  { href: '/', label: 'Fleet', hint: 'Every Drone, and what needs doing to it' },
  { href: '/walls', label: 'Walls', hint: 'See the whole class at once' },
  { href: '/students', label: 'Students', hint: 'The class, and Drone assignment' },
  { href: '/reports', label: 'Reports', hint: 'What happened, and which Drone keeps doing it' },
  { href: '/vision', label: 'Vision', hint: 'Whether the camera and the model actually work' },
] as const

/** The Mission run, for the command palette. Also first in the button's own list now. */
export const MISSION_RUN_DESTINATION = DESTINATIONS[0]

/**
 * The button. Lives in the bar's top row; the panel it opens does not.
 *
 * Split from the panel because the panel has to sit **below** the whole row rather than hang
 * off this element. A dropdown anchored here overlaid the status bar underneath it, which is
 * the strip that says which Fleet a Teacher is looking at.
 */
export function SiteNavButton({
  open,
  onToggle,
  menuId,
  buttonRef,
}: {
  readonly open: boolean
  readonly onToggle: () => void
  readonly menuId: string
  readonly buttonRef?: RefObject<HTMLButtonElement | null>
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="site-nav__button"
      aria-expanded={open}
      aria-controls={menuId}
      onClick={onToggle}
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
  )
}

/**
 * The panel, below the bar rather than over what follows it.
 *
 * A full sheet on a tablet or a phone, because a small dropdown is hard to hit with a thumb,
 * and because the room controls fold in here at that width rather than wrapping the bar onto
 * a second row. On a laptop it is a column under the button.
 *
 * `hidden` rather than unmounted, so the button's `aria-controls` always points at something.
 * The stylesheet has to say `display: none` for it explicitly, because a `display: flex` rule
 * beats the attribute's own default.
 */
export function SiteNavPanel({
  open,
  onClose,
  menuId,
  children,
}: {
  readonly open: boolean
  readonly onClose: () => void
  readonly menuId: string
  /** The room controls, folded in at the widths where the bar has no room for them. */
  readonly children?: ReactNode
}) {
  const pathname = usePathname()

  return (
    /*
     * The landmark is always here and the panel inside it comes and goes. `hidden` on the
     * `<nav>` itself took the landmark out of the accessibility tree whenever the panel was
     * shut, which is most of the time: a screen reader user would have found no Sections
     * navigation on the board at all. A block whose only child is `display: none` has no
     * height, so this costs the layout nothing.
     */
    <nav className="site-nav" aria-label="Sections">
      <div id={menuId} className="site-nav__panel" hidden={!open}>
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
                  onClick={onClose}
                >
                  {destination.label}
                </Link>
              </li>
            )
          })}
        </ul>

        {children === undefined ? null : <div className="site-nav__tools">{children}</div>}
      </div>
    </nav>
  )
}

/**
 * Escape shuts the panel and puts the focus back on the button, and a press outside shuts it.
 *
 * A Teacher who opened this from the keyboard and shut it again has nowhere to be otherwise,
 * and the next Tab would start from the top of the page.
 */
export function useSiteNavDismiss({
  open,
  close,
  within,
  buttonRef,
}: {
  readonly open: boolean
  readonly close: () => void
  readonly within: RefObject<HTMLElement | null>
  readonly buttonRef: RefObject<HTMLButtonElement | null>
}) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      buttonRef.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && within.current?.contains(target)) return
      close()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, close, within, buttonRef])
}
