import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DESTINATIONS, MISSION_RUN_DESTINATION, SiteNav } from './SiteNav'

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
 * Five places, behind one button.
 *
 * The count matters, and so does the fact that they are shut. Seven links across the top of
 * a screen that also carries a twelve-step rail is two navigations competing, which is the
 * confusion ADR-0026 exists to remove.
 */
describe('where a Teacher can go', () => {
  it('shows one button rather than a row of links', () => {
    pathname.current = '/'
    render(<SiteNav />)

    const button = screen.getByRole('button', { name: /go to/i })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('offers the five places that are not part of one Mission run', () => {
    pathname.current = '/'
    render(<SiteNav />)

    fireEvent.click(screen.getByRole('button', { name: /go to/i }))

    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Fleet',
      'Walls',
      'Students',
      'Reports',
      'Vision',
    ])
  })

  /*
   * The two that left. They are steps on the Mission run page now, and the rail is how a
   * Teacher reaches them. Offering them here as well would put a Teacher on `/lesson` and
   * `/mission?step=1` by two different routes to the same work.
   *
   * Reports is not one of them. Step 12 is the debrief of the Mission just sealed; `/reports`
   * is the term, and it must not be behind a step that can be locked.
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
 * How the panel hides, read from the stylesheet.
 *
 * jsdom has no cascade, so `hidden` on a `display: flex` element reads as hidden to a test
 * and renders as a permanently open menu over the board. The attribute's own default is
 * `display: none` and a `display` declaration beats it, which is exactly the trap: delete
 * one rule and the panel is open on every screen with every test still green.
 */
describe('how the sections panel opens and shuts', () => {
  it('says display none for a hidden panel, because flex would beat the attribute', () => {
    expect(rule('.site-nav__list')).toMatch(/display:\s*flex/)
    expect(rule('.site-nav__list[hidden]')).toMatch(/display:\s*none/)
  })

  it('hangs the panel off the button rather than pushing the bar around', () => {
    expect(rule('.site-nav')).toMatch(/position:\s*relative/)
    expect(rule('.site-nav__list')).toMatch(/position:\s*absolute/)
  })

  /* The current section is marked without colour, so it survives a projector (ADR-0004). */
  it('marks the current section with a rule as well as a weight', () => {
    expect(rule('.site-nav__link--active')).toMatch(/font-weight:\s*600/)
    expect(rule('.site-nav__link--active::before')).toMatch(/background:\s*var\(--foreground\)/)
  })
})
