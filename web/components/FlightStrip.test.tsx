import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ControlScreen } from './ControlScreen'
import { FleetProvider } from './FleetProvider'

/**
 * The flight strip's fixed anatomy.
 *
 * §1.1 of docs/DESIGN.md justifies the whole strip format on being "scannable by position
 * rather than by reading — the eye learns where charge is and stops re-finding it". Two
 * things have to hold for that to be true, and neither was:
 *
 * 1. A row says each fact once. A grounded strip printed "On the ground" in the phase
 *    column and again in the height column beside it.
 * 2. The columns are the same across every strip, not per-row. The row was a flex-wrap, so
 *    a variable-width phase word shifted every column to its right — invisible only because
 *    every Drone happened to be in the same phase.
 *
 * The simulator starts every Drone on the ground, which is the grounded case exactly.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/** The strip for one Drone: its name is a link, and the strip is the list item holding it. */
function stripFor(name: string): HTMLElement {
  const link = screen.getByRole('link', { name })
  const strip = link.closest('li')
  expect(strip, `no strip for ${name}`).not.toBeNull()
  return strip as HTMLElement
}

const occurrences = (text: string, phrase: string) =>
  text.split(phrase).length - 1

describe('a grounded flight strip', () => {
  it('says "On the ground" once, not once for the phase and again for the height', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    // Every Drone the simulator ships starts on the ground.
    for (const name of ['Drone 1', 'Drone 2', 'Drone 3', 'Drone 4', 'Drone 5', 'Drone 6']) {
      const strip = stripFor(name)
      expect(
        occurrences(strip.textContent ?? '', 'On the ground'),
        `${name} says it more than once`,
      ).toBe(1)
    }
  })

  it('still carries the phase, the charge and the response age', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const strip = stripFor('Drone 1')
    const text = strip.textContent ?? ''
    expect(text).toContain('On the ground') // phase
    expect(text).toMatch(/\d+%/) // charge
    expect(text).toMatch(/Response|No response/) // response age
  })
})

describe('the strip anatomy is fixed across strips, not per row', () => {
  /*
   * The columns live on the list and each strip takes them by subgrid, so a wide value in
   * one strip cannot push another strip's columns around. jsdom cannot measure the result,
   * but it can hold the structure that produces it — which is the thing a future edit would
   * quietly undo by dropping back to a flex row.
   */
  it('lays the strips out on a shared grid the strips inherit', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()

    const list = stripFor('Drone 1').parentElement as HTMLElement
    expect(list.className).toMatch(/grid-cols-\[/)

    for (const name of ['Drone 1', 'Drone 6']) {
      expect(stripFor(name).className).toContain('grid-cols-subgrid')
    }
  })
})

/**
 * The coordinate line, and the tap target beneath it.
 *
 * §4.4 records a bug found and fixed once already: a strip wraps its Alerts onto following
 * lines, and those lines paint over an expanded hit area, leaving the bottom half of a
 * Command unclickable on a tablet. **Adding a line to every strip is the change most likely
 * to bring that back**, so the Commands are hit-tested here rather than read off the CSS.
 */
describe('the coordinate group on every strip', () => {
  const stripsOnScreen = () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <ControlScreen />
      </FleetProvider>,
    )
    settle()
  }

  it('is on its own line, not threaded into the head row', () => {
    stripsOnScreen()

    const strip = stripFor('Drone 1')
    const line = [...strip.querySelectorAll('p')].find((p) => /^X /.test(p.textContent ?? ''))
    expect(line, 'no coordinate line on the strip').toBeTruthy()

    /*
     * The head row is the element carrying the six subgrid cells. The coordinate line must
     * not be inside it — that is the whole point of putting it below, and it is the one
     * thing a careless edit would undo while still looking right in a screenshot.
     */
    const headRow = screen.getByRole('link', { name: 'Drone 1' }).parentElement
    expect(headRow).toBeTruthy()
    expect(headRow!.contains(line!)).toBe(false)
  })

  it('appears on every strip rather than only the selected one', () => {
    stripsOnScreen()

    for (const name of ['Drone 1', 'Drone 2', 'Drone 3', 'Drone 4', 'Drone 5', 'Drone 6']) {
      expect(stripFor(name).textContent, name).toMatch(/X \d+\.\d m/)
    }
  })

  /*
   * The §4.4 bug is a Command painted over by a line beneath it, and jsdom has no layout
   * engine, so it cannot see that happening — the real hit-test is done in a browser at
   * 390 px and recorded on the issue. What is checkable here is the half that would make the
   * overlap possible at all: the coordinate line is an ordinary block in the flow, and the
   * Commands come after it in document order rather than sharing space with it.
   *
   * Land and Hold are correctly `disabled` on a grounded Drone — there is nothing to land —
   * so this asserts they are present and ordered, not that they are pressable.
   */
  it('puts the Commands after the line it grew, in the flow rather than over it', () => {
    stripsOnScreen()

    const strip = stripFor('Drone 1')
    const line = [...strip.querySelectorAll('p')].find((p) => /^X /.test(p.textContent ?? ''))!
    const land = within(strip).getByRole('button', { name: 'Land' })

    expect(within(strip).getByRole('button', { name: 'Hold' })).toBeInTheDocument()
    // DOCUMENT_POSITION_FOLLOWING: the Command comes after the new line, not beneath it.
    expect(line.compareDocumentPosition(land) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(line.className).not.toMatch(/absolute|fixed/)
  })
})
