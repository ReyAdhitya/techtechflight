import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { ReportsScreen } from './ReportsScreen'

/**
 * Reports print — the button, and the stylesheet invariants jsdom cannot see.
 *
 * Empty preview pages were dark-theme tokens still light-on-white. Blanket
 * `break-inside: avoid` on every section left page 1 blank. Both are pinned here by
 * reading `globals.css`, same idea as `SiteHeader.test.tsx`.
 */

vi.mock('next/navigation', () => ({
  usePathname: () => '/reports',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const CSS = readFileSync(resolve(process.cwd(), 'web/app/globals.css'), 'utf8')

function printBlock(): string {
  const at = CSS.indexOf('Printing a Lesson report.')
  expect(at, 'print comment missing from globals.css').toBeGreaterThan(-1)
  return CSS.slice(at)
}

describe('Reports Print', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.title = ''
  })

  it('opens the browser print dialog from the Print button', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})

    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ReportsScreen />
      </FleetProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Print' }))
    expect(print).toHaveBeenCalledTimes(1)
    expect(document.title).toBe('TechTech Flight — Lesson records')
  })

  it('forces paper colour tokens when printing, including dark theme', () => {
    const block = printBlock()
    expect(block).toMatch(/\[data-theme='dark'\]/)
    expect(block).toMatch(/--foreground:\s*#1b1815/)
    expect(block).toMatch(/--background:\s*#ffffff/)
    expect(block).toMatch(/color-scheme:\s*light/)
  })

  it('avoids page breaks on Lesson cards only, not every section', () => {
    const block = printBlock()
    expect(block).toMatch(/\.lesson-report\s*\{[^}]*break-inside:\s*avoid/s)
    expect(block).not.toMatch(/\bli,\s*\n\s*section\s*\{/)
  })
})
