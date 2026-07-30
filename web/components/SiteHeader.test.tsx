import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { SiteHeader } from './SiteHeader'

/**
 * The bar, and the one line under it that says which Fleet this is.
 *
 * Two kinds of assertion here, deliberately. What the bar *contains* is checked by
 * rendering it. How the bar *stacks* is checked by reading the stylesheet, because jsdom
 * has no layout engine — it will happily report a broken flex axis as fine. The same
 * reasoning `vercel-routing.test.ts` uses for reading `vercel.json` rather than deploying.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const CSS = readFileSync(resolve(process.cwd(), 'web/app/globals.css'), 'utf8')

/** The declarations of one rule, by selector, from the single stylesheet. */
function rule(selector: string): string {
  const at = CSS.indexOf(`${selector} {`)
  expect(at, `${selector} is not in globals.css`).toBeGreaterThan(-1)
  return CSS.slice(at, CSS.indexOf('}', at))
}

describe('the bar every screen carries', () => {
  it('carries identity, the places to go, and the room controls', () => {
    pathname.current = '/'
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <SiteHeader />
      </FleetProvider>,
    )

    expect(screen.getByRole('img', { name: /TechTech Flight Deck/i })).toBeInTheDocument()
    // "Sections", not "Main" — the board's own word for its five places (globals.css).
    expect(screen.getByRole('navigation', { name: /sections/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
  })

  /*
   * The logo goes to Control, which is not where a header logo conventionally goes. The
   * reasoning is in `docs/DECISIONS.md`; what matters here is that it is a real link with a
   * name that says where it leads, because the mark on its own says nothing about that.
   */
  it('makes the logo a link to Control', () => {
    pathname.current = '/'
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <SiteHeader />
      </FleetProvider>,
    )

    const brand = screen.getByRole('link', { name: /go to Control/i })
    expect(brand).toHaveAttribute('href', '/control')
    expect(brand).toContainElement(screen.getByRole('img', { name: /TechTech Flight Deck/i }))
  })

  /*
   * The product name is not part of the logo. It sits the far side of a divider rule and
   * says what the software is rather than whose it is, so taking it into the link would make
   * the two read as one control.
   */
  it('leaves the product name beside the logo outside the link', () => {
    pathname.current = '/'
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <SiteHeader />
      </FleetProvider>,
    )

    expect(screen.getByRole('link', { name: /go to Control/i })).not.toHaveTextContent(
      /Flight Deck/,
    )
    // Still on screen — outside the link, not removed from it.
    expect(screen.getByText('Flight Deck')).toBeInTheDocument()
  })

  it('says which Fleet this is, underneath, when the Fleet is simulated', () => {
    pathname.current = '/demo'
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <SiteHeader />
      </FleetProvider>,
    )

    const label = screen.getByRole('status')
    expect(label).toHaveTextContent(/Simulated Fleet — no aircraft are being contacted/i)

    // Under the bar, not inside it. The label is the sticky layer's own line, and a
    // Teacher reads it as a statement about the screen rather than as another control.
    const bar = screen.getByRole('banner')
    expect(bar).not.toContainElement(label)
    expect(bar.parentElement).toContainElement(label)
  })

  it('says nothing at all when the Fleet is real', () => {
    pathname.current = '/'
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <SiteHeader />
      </FleetProvider>,
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('how the sticky layer stacks', () => {
  /*
   * The bug this pins.
   *
   * `.site-header-shell` holds two children — the bar, and the simulation label. It was
   * `display: flex` with no axis, so the two became columns of a row: the label lost its
   * full width, took the bar's height, and rendered as a white block wedged beside the
   * navigation on every screen. On a phone it grew to a quarter of the viewport.
   *
   * The label's own rule was never wrong — it is written as a full-width strip, centred,
   * with a bottom rule. Only the axis above it was.
   */
  it('stacks the bar and the label rather than setting them side by side', () => {
    const shell = rule('.site-header-shell')
    expect(shell).toContain('display: flex')
    expect(shell).toContain('flex-direction: column')
  })

  it('keeps the label a full-width strip', () => {
    const label = rule('.simulation-label')
    expect(label).toContain('text-align: center')
    // A strip that only spans its own text would be a badge, which §9 of design.md
    // rejects: the way a badge fails is that the eye stops seeing it.
    expect(label).toContain('width: 100%')
  })
})
