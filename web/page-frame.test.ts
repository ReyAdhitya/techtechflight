import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { INSTRUMENT_FRAME, READING_FRAME } from './lib/frame'

/**
 * One page frame, in two named widths, and no screen inventing a third.
 *
 * Read from source rather than rendered, for the same reason `import-boundaries.test.ts`
 * is: the rule is about what the code is allowed to say, and jsdom has no layout engine
 * to check the result with anyway.
 *
 * What this catches is drift. Five screens once carried five different maxima — 6xl, 5xl,
 * 4xl, 3xl and none — not as a decision but because each was written on a different day.
 * Nothing failed, and the content edge moved every time a Teacher changed screen.
 */

const SCREENS = {
  instrument: ['FleetBoard', 'FleetScreen', 'ControlScreen'],
  reading: ['LessonScreen', 'ReportsScreen', 'StudentsScreen', 'SettingsScreen'],
} as const

const source = (component: string) =>
  readFileSync(resolve(process.cwd(), `web/components/${component}.tsx`), 'utf8')

describe('the page frame', () => {
  it('gives every screen that is looked at the instrument frame', () => {
    for (const component of SCREENS.instrument) {
      expect(source(component), component).toContain('INSTRUMENT_FRAME')
    }
  })

  it('gives every screen that is read the reading frame', () => {
    for (const component of SCREENS.reading) {
      expect(source(component), component).toContain('READING_FRAME')
    }
  })

  /*
   * The rule that actually holds the line. A screen may use either frame; what it may not
   * do is write its own maximum, because that is how the five widths appeared in the first
   * place — one at a time, each reasonable on its own.
   *
   * Character maxima (`max-w-[52ch]`) are a different thing and stay allowed: they cap a
   * line of prose for readability, not the page.
   */
  it('lets no screen declare a page width of its own', () => {
    for (const component of [...SCREENS.instrument, ...SCREENS.reading]) {
      const invented = source(component).match(/max-w-(?:\d?xl|screen-\w+|full)\b/g)
      expect(invented, `${component} declares its own page width`).toBeNull()
    }
  })

  it('keeps both frames one centred column', () => {
    for (const frame of [INSTRUMENT_FRAME, READING_FRAME]) {
      expect(frame).toContain('mx-auto')
      expect(frame).toContain('w-full')
      expect(frame).toMatch(/max-w-\d?xl/)
    }
  })

  /*
   * The instrument frame has a job the reading frame does not: hold four Drone tiles at
   * 1440px. `fleet-grid` fills with `minmax(min(100%, 17rem), 1fr)` at a `gap-4`, so four
   * columns need 4 × 17rem + 3 × 1rem = 71rem of content, inside 4rem of padding.
   */
  it('leaves the board wide enough for four Drones on a laptop', () => {
    const maximum = Number(INSTRUMENT_FRAME.match(/max-w-(\d)xl/)?.[1])
    // Tailwind's 7xl is 80rem; the scale steps 3xl…7xl are 48, 56, 64, 72, 80.
    const rem = { 3: 48, 4: 56, 5: 64, 6: 72, 7: 80 }[maximum]
    expect(rem, 'unrecognised frame width').toBeDefined()
    expect(rem! - 4).toBeGreaterThanOrEqual(71)
  })
})
