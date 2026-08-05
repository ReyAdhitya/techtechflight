import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { noMissionYet, type MissionFlowFacts } from '@/lib/mission-flow'
import { StepRail } from './StepRail'

/**
 * The rail, and the two things that make it not the rail that was withdrawn.
 *
 * What it says is checked by rendering. How it opens and shuts is checked by reading
 * globals.css, because jsdom has no layout engine and would report a rail that never
 * animates, or one that covers the board on a projector, as perfectly fine.
 */

const CSS = readFileSync(resolve(process.cwd(), 'web/app/globals.css'), 'utf8')

function rule(selector: string): string {
  const at = CSS.indexOf(`${selector} {`)
  expect(at, `${selector} is not in globals.css`).toBeGreaterThan(-1)
  return CSS.slice(at, CSS.indexOf('}', at))
}

const facts = (over: Partial<MissionFlowFacts> = {}): MissionFlowFacts => ({
  ...noMissionYet(),
  ...over,
})

const railFor = (over: Partial<MissionFlowFacts> = {}, open = true) =>
  render(<StepRail facts={facts(over)} open={open} onToggle={() => {}} />)

describe('the Mission step rail', () => {
  it('names all twelve steps under their three phases', () => {
    railFor()

    expect(screen.getByRole('navigation', { name: /Mission steps/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(12)
    for (const phase of ['Set up', 'In the air', 'Close down']) {
      expect(screen.getByText(phase)).toBeInTheDocument()
    }
  })

  /*
   * The whole reason for a second attempt at a left rail. The first one could send a
   * Teacher to a step that silently did nothing; this one says what is in the way.
   */
  it('says what is standing in the way of a step that is not open', () => {
    railFor()

    expect(screen.getByTitle(/2\. Mission area · Pick a Mission Scenario first/i))
      .toBeInTheDocument()
    expect(screen.getByTitle(/7\. Where everything is · Grant a takeoff clearance first/i))
      .toBeInTheDocument()
  })

  it('marks the step the Teacher is on, and only that one', () => {
    railFor({ scenarioChosen: true })

    const current = screen.getAllByRole('link').filter(
      (link) => link.getAttribute('aria-current') === 'step',
    )
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAccessibleName(/Mission area/i)
  })

  it('counts finished steps without counting the ones still happening', () => {
    railFor({
      scenarioChosen: true,
      missionZoneDrawn: true,
      teamOnCraft: true,
      preFlightPassed: true,
      briefed: true,
      cleared: true,
      airborne: true,
    })

    expect(screen.getByText('6 of 12 done')).toBeInTheDocument()
    expect(screen.getByTitle(/9\. Commands · Happening now/i)).toBeInTheDocument()
  })

  it('shows how far through the run it is, as a bar as well as a count', () => {
    railFor({
      scenarioChosen: true,
      missionZoneDrawn: true,
      teamOnCraft: true,
    })

    const bar = screen.getByRole('progressbar', { name: /Mission run progress/i })
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '12')
  })

  it('names the Lesson whose day this is, and falls back when there is none', () => {
    const { rerender } = railFor()
    expect(screen.getByText('Mission run')).toBeInTheDocument()

    rerender(
      <StepRail facts={facts()} lessonName="Year 8, period 3" open onToggle={() => {}} />,
    )
    expect(screen.getByText('Year 8, period 3')).toBeInTheDocument()
  })

  it('says whether it is open, and offers the other state as the button', () => {
    const { rerender } = railFor({}, true)
    expect(screen.getByRole('navigation', { name: /Mission steps/i }))
      .toHaveAttribute('data-open', 'true')
    expect(screen.getByRole('button', { name: /Minimise the Mission steps/i })).toBeInTheDocument()

    rerender(<StepRail facts={facts()} open={false} onToggle={() => {}} />)
    expect(screen.getByRole('navigation', { name: /Mission steps/i }))
      .toHaveAttribute('data-open', 'false')
    expect(screen.getByRole('button', { name: /Maximise the Mission steps/i })).toBeInTheDocument()
    // Phone/tablet way back into a closed overlay rail (#625).
    expect(screen.getByRole('button', { name: /^Steps$/i })).toBeInTheDocument()
  })

  it('calls back when the Teacher works the toggle', () => {
    const onToggle = vi.fn()
    render(<StepRail facts={facts()} open onToggle={onToggle} />)

    screen.getByRole('button', { name: /Minimise/i }).click()
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  /* Steps stay reachable while minimised. The names arrive through `title`. */
  it('keeps every step a link when minimised', () => {
    railFor({}, false)
    expect(screen.getAllByRole('link')).toHaveLength(12)
  })
})

describe('how the rail opens and shuts', () => {
  it('animates on width alone, with the shared chrome easing', () => {
    const open = rule('.step-rail')
    expect(open).toMatch(/transition:\s*width var\(--chrome-duration\) var\(--chrome-ease\)/)
    expect(open).toMatch(/width:\s*18\.5rem/)

    expect(rule(".step-rail[data-open='false']")).toMatch(/width:\s*4\.25rem/)
  })

  it('leaves the board alone on a narrow screen by sliding over it', () => {
    const at = CSS.indexOf('@media (max-width: 60rem)', CSS.indexOf('.step-rail {'))
    expect(at, 'the rail has no narrow-screen behaviour').toBeGreaterThan(-1)
    const block = CSS.slice(at, at + 1200)

    expect(block).toMatch(/position:\s*fixed/)
    expect(block).toMatch(/transform:\s*translateX\(-100%\)/)
    expect(block).toContain('.step-rail__reveal')
  })

  it('holds still for a Teacher who asked for less motion', () => {
    const at = CSS.lastIndexOf('@media (prefers-reduced-motion: reduce)', CSS.indexOf('.simulation-label'))
    const block = CSS.slice(at, at + 300)
    expect(block).toContain('.step-rail')
    expect(block).toMatch(/transition:\s*none/)
  })
})
