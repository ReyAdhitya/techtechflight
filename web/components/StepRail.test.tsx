import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { noMissionYet, type MissionFlowFacts } from '@/lib/mission-flow'
import { noMissionSummaryYet, type MissionFlowSummary } from '@/lib/mission-flow-summary'
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

/** Everything the set-up asks for, so a clearance below is a reachable one. */
const allSetUp: Partial<MissionFlowFacts> = {
  scenarioChosen: true,
  noFlyZoneDrawn: true,
  teamOnCraft: true,
  preFlightPassed: true,
  briefed: true,
}

const counts = (over: Partial<MissionFlowSummary> = {}): MissionFlowSummary => ({
  ...noMissionSummaryYet(),
  ...over,
})

const railFor = (
  over: Partial<MissionFlowFacts> = {},
  open = true,
  summary: Partial<MissionFlowSummary> = {},
) =>
  render(
    <StepRail facts={facts(over)} summary={counts(summary)} open={open} onToggle={() => {}} />,
  )

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

    expect(screen.getByTitle('2. Mission area, Choose a Scenario first')).toBeInTheDocument()
    expect(screen.getByTitle('7. Where everything is, Grant a takeoff first')).toBeInTheDocument()
  })

  /*
   * The other half of the same idea. A step behind the Teacher says what it decided, so
   * they do not have to open it to find out which Scenario they picked half an hour ago.
   */
  it('says what a finished step decided rather than only that it is finished', () => {
    railFor(
      { scenarioChosen: true, noFlyZoneDrawn: true },
      true,
      { scenarioName: 'Search and Rescue', noFlyZones: 2, teams: 4, craft: 3 },
    )

    expect(screen.getByTitle('1. Mission Scenario, Search and Rescue')).toBeInTheDocument()
    expect(screen.getByText('Search and Rescue')).toBeInTheDocument()
    expect(screen.getByText('2 no-fly zones')).toBeInTheDocument()
  })

  /*
   * Steps 7 to 10 are true at the same time while a class is up. A rail that ticked them
   * off in order would be describing a workflow nobody has, so they read as live and carry
   * a count rather than a tick.
   */
  it('reads the flying steps as live, with what is happening rather than a tick', () => {
    render(
      <StepRail
        facts={facts({ ...allSetUp, cleared: true, airborne: true })}
        summary={counts({ airborne: 3, selectedCraftName: 'Kestrel', criticalAlerts: 1 })}
        activeStep={6}
        open
        onToggle={() => {}}
      />,
    )

    expect(screen.getByTitle('7. Where everything is, 3 airborne')).toBeInTheDocument()
    expect(screen.getByTitle('8. Telemetry and camera, Kestrel selected')).toBeInTheDocument()
    expect(screen.getByTitle('9. Commands, Nothing sent yet')).toBeInTheDocument()
    expect(screen.getByTitle('10. Alerts, 1 critical')).toBeInTheDocument()
  })

  /*
   * A Teacher can untick the brief after granting a clearance. Step 5 is behind them and
   * its condition has stopped holding, and a tick beside "Pre-flight one craft first" is
   * the rail arguing with itself.
   */
  it('never shows a tick beside a reason the step is not open', () => {
    railFor(
      { scenarioChosen: true, briefed: true },
      true,
      { scenarioName: 'Delivery', briefSections: 5, briefSectionsTicked: 5 },
    )

    expect(screen.getByTitle('5. Rules and brief, 5 of 5 ticked')).toBeInTheDocument()
    expect(screen.queryByText('Pre-flight one craft first')).not.toBeInTheDocument()
  })

  /*
   * A Teacher looking ahead down the rail sees the step they are reading marked, and only
   * that one. Two rows both saying "You are here" is the rail contradicting itself.
   */
  it('marks one step as current even when the Teacher is looking ahead', () => {
    render(
      <StepRail
        facts={facts()}
        summary={counts()}
        activeStep={9}
        open
        onToggle={() => {}}
      />,
    )

    expect(screen.getAllByText('You are here')).toHaveLength(1)
    expect(screen.getByTitle('9. Commands, You are here')).toBeInTheDocument()
    expect(screen.getByTitle('1. Mission Scenario, Not chosen yet')).toBeInTheDocument()
  })

  /* Colour is never the only channel (ADR-0004), so each mark carries a word as well. */
  it('gives every mark a word, not only a fill', () => {
    railFor({ ...allSetUp, cleared: true, airborne: true }, true, { airborne: 2 })

    expect(screen.getByRole('link', { name: /^Done\. Mission Scenario/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Happening now\. Telemetry and camera/ }))
      .toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^You are here\. Where everything is/ }))
      .toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Not open yet\. Logs and debrief/ }))
      .toBeInTheDocument()
  })

  it('marks the step the Teacher is on, and only that one', () => {
    railFor({ scenarioChosen: true })

    const current = screen.getAllByRole('link').filter(
      (link) => link.getAttribute('aria-current') === 'step',
    )
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAccessibleName(/Mission area/i)
    expect(current[0]).toHaveAttribute('title', '2. Mission area, You are here')
  })

  it('counts finished steps without counting the ones still happening', () => {
    railFor({
      scenarioChosen: true,
      noFlyZoneDrawn: true,
      teamOnCraft: true,
      preFlightPassed: true,
      briefed: true,
      cleared: true,
      airborne: true,
    })

    expect(screen.getByText('6 of 12 done')).toBeInTheDocument()
    expect(screen.getByTitle('9. Commands, Nothing sent yet')).toBeInTheDocument()
  })

  it('shows how far through the run it is, as a bar as well as a count', () => {
    railFor({
      scenarioChosen: true,
      noFlyZoneDrawn: true,
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

  it('sends every step to the one Mission run page, naming the step', () => {
    railFor()

    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(
      Array.from({ length: 12 }, (_, index) => `/mission?step=${index + 1}`),
    )
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
    const block = CSS.slice(at, at + 900)

    expect(block).toMatch(/position:\s*fixed/)
    expect(block).toMatch(/transform:\s*translateX\(-100%\)/)
  })

  it('holds still for a Teacher who asked for less motion', () => {
    const at = CSS.lastIndexOf('@media (prefers-reduced-motion: reduce)', CSS.indexOf('.simulation-label'))
    const block = CSS.slice(at, at + 300)
    expect(block).toContain('.step-rail')
    expect(block).toMatch(/transition:\s*none/)
  })
})
