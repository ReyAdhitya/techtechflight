import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { useCallback, useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  DESTINATIONS,
  MISSION_RUN_DESTINATION,
  SiteNavButton,
  SiteNavPanel,
  useSiteNavDismiss,
} from './SiteNav'

const CSS = readFileSync(resolve(process.cwd(), 'web/app/globals.css'), 'utf8')

/** The declarations of one rule, by selector, from the single stylesheet. */
function rule(selector: string): string {
  const at = CSS.indexOf(`${selector} {`)
  expect(at, `${selector} is not in globals.css`).toBeGreaterThan(-1)
  return CSS.slice(at, CSS.indexOf('}', at))
}

const pathname = vi.hoisted(() => ({ current: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

/**
 * The button and the panel, composed the way `SiteHeader` composes them.
 *
 * They are two components because the panel is a row of the bar rather than a dropdown
 * hanging off the button, and a test that rendered them separately would not be testing the
 * thing that ships.
 */
function SiteNav() {
  const [open, setOpen] = useState(false)
  const shell = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useSiteNavDismiss({ open, close, within: shell, buttonRef: button })

  return (
    <div ref={shell}>
      <SiteNavButton
        open={open}
        onToggle={() => setOpen((was) => !was)}
        menuId="sections"
        buttonRef={button}
      />
      <SiteNavPanel open={open} onClose={close} menuId="sections" />
    </div>
  )
}

/**
 * Where a Teacher can go, behind one button.
 *
 * The count matters, and so does the fact that they are shut. Seven links across the top of a
 * screen that also carries a twelve-step rail is two navigations competing, which is the
 * confusion ADR-0026 exists to remove.
 */
describe('where a Teacher can go', () => {
  it('shows one button rather than a row of links', () => {
    pathname.current = '/'
    render(<SiteNav />)

    const button = screen.getByRole('button', { name: /go to/i })
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  /*
   * Mission run leads. It left the list when the rail returned, which was right on the
   * Mission run page and wrong everywhere else: from Walls there was no way back to the
   * lesson at all except Ctrl + K, which does not exist on a tablet.
   */
  it('leads with the Mission run, then the five places a Mission run does not answer', () => {
    pathname.current = '/'
    render(<SiteNav />)

    fireEvent.click(screen.getByRole('button', { name: /go to/i }))

    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Mission run',
      'Fleet',
      'Walls',
      'Students',
      'Reports',
      'Vision',
    ])
  })

  /*
   * Lesson and Control are steps on the Mission run page now, and the rail is how a Teacher
   * reaches them. Offering them here as well would put a Teacher on `/lesson` and
   * `/mission?step=1` by two different routes to the same work.
   */
  it('does not offer Lesson or Control, which are steps now', () => {
    pathname.current = '/'
    render(<SiteNav />)

    fireEvent.click(screen.getByRole('button', { name: /go to/i }))

    for (const gone of ['Lesson', 'Control']) {
      expect(screen.queryByRole('link', { name: gone })).not.toBeInTheDocument()
    }
  })

  it('does not offer Settings, which is not a place in the workflow', () => {
    pathname.current = '/'
    render(<SiteNav />)

    fireEvent.click(screen.getByRole('button', { name: /go to/i }))

    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('does not offer the screens that were folded into others', () => {
    pathname.current = '/'
    render(<SiteNav />)

    fireEvent.click(screen.getByRole('button', { name: /go to/i }))

    for (const gone of ['History', 'Maintenance', 'Tower']) {
      expect(screen.queryByRole('link', { name: gone })).not.toBeInTheDocument()
    }
  })

  it('marks the screen a Teacher is on', () => {
    pathname.current = '/students'
    render(<SiteNav />)

    fireEvent.click(screen.getByRole('button', { name: /go to/i }))

    expect(screen.getByRole('link', { name: 'Students' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('marks Walls active on wall subroutes', () => {
    pathname.current = '/walls/cameras'
    render(<SiteNav />)

    fireEvent.click(screen.getByRole('button', { name: /go to/i }))

    expect(screen.getByRole('link', { name: 'Walls' })).toHaveAttribute('aria-current', 'page')
  })

  it('treats the demonstration board as the Fleet, because it is the same screen', () => {
    pathname.current = '/demo'
    render(<SiteNav />)

    fireEvent.click(screen.getByRole('button', { name: /go to/i }))

    expect(screen.getByRole('link', { name: 'Fleet' })).toHaveAttribute('aria-current', 'page')
  })

  /* Escape has to bring the focus back, or the next Tab starts from the top of the page. */
  it('shuts on Escape and gives the focus back to the button', () => {
    pathname.current = '/'
    render(<SiteNav />)

    const button = screen.getByRole('button', { name: /go to/i })
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('shuts when a Teacher goes somewhere', () => {
    pathname.current = '/'
    render(<SiteNav />)

    const button = screen.getByRole('button', { name: /go to/i })
    fireEvent.click(button)

    const walls = screen.getByRole('link', { name: 'Walls' })
    // jsdom cannot navigate, and says so on stderr unless the default is stopped first.
    walls.addEventListener('click', (event) => event.preventDefault())
    fireEvent.click(walls)

    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('every destination is a real route', () => {
    expect(DESTINATIONS.map((destination) => destination.href)).toEqual([
      '/mission',
      '/',
      '/walls',
      '/students',
      '/reports',
      '/vision',
    ])
    expect(MISSION_RUN_DESTINATION.href).toBe('/mission')
  })
})

/**
 * How the panel hides and where it sits, read from the stylesheet.
 *
 * jsdom has no cascade, so `hidden` on a `display: flex` element reads as hidden to a test
 * and renders as a permanently open menu over the board. The attribute's own default is
 * `display: none` and a `display` declaration beats it, which is exactly the trap: delete
 * one rule and the panel is open on every screen with every test still green.
 */
describe('how the sections panel opens and shuts', () => {
  it('says display none for a hidden panel, because flex would beat the attribute', () => {
    expect(rule('.site-nav__panel')).toMatch(/display:\s*flex/)
    expect(rule('.site-nav__panel[hidden]')).toMatch(/display:\s*none/)
  })

  /*
   * The panel is the bar's second row rather than a dropdown over the page. Anchored to the
   * button it covered the status bar underneath — the one strip that says which Fleet a
   * Teacher is looking at — so the thing you opened hid the thing that says what you see.
   */
  it('sits in the flow of the bar rather than over what follows it', () => {
    expect(rule('.site-header')).toMatch(/flex-direction:\s*column/)
    expect(rule('.site-nav__panel')).not.toMatch(/position:\s*absolute/)
    expect(rule('.site-nav')).not.toMatch(/position:\s*relative/)
  })

  /* Nothing in the bar may wrap. Settings fell to a second row and turned up in a corner. */
  it('refuses to wrap the room controls', () => {
    expect(rule('.site-header__controls')).toMatch(/flex-wrap:\s*nowrap/)
    expect(rule('.site-header__settings')).toMatch(/white-space:\s*nowrap/)
  })

  /* The current section is marked without colour, so it survives a projector (ADR-0004). */
  it('marks the current section with a rule as well as a weight', () => {
    expect(rule('.site-nav__link--active')).toMatch(/font-weight:\s*600/)
    expect(rule('.site-nav__link--active::before')).toMatch(/background:\s*var\(--foreground\)/)
  })
})
