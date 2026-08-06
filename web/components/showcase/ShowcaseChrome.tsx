'use client'

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { readServerTheme, readTheme, subscribeTheme, writeTheme } from '@/lib/theme'
import { SCENARIOS, type ScenarioId } from '@/lib/scenarios'
import { Button } from './ui/button'

export interface ShowcaseChromeProps {
  readonly scenario: ScenarioId
  readonly onScenario: (next: ScenarioId) => void
  /** True when the live connection has never produced a Fleet State. */
  readonly liveUnavailable: boolean
}

/**
 * The bar, and the showcase's one piece of furniture that the real board would not have.
 *
 * The scenario switcher exists because a maximalist board is easiest to admire on its
 * happy path, and the honest comparison is on the unglamorous ones. It is a control for
 * whoever is judging this, not a control for a Teacher, and it says so.
 */
export function ShowcaseChrome({ scenario, onScenario, liveUnavailable }: ShowcaseChromeProps) {
  const reduced = useReducedMotion()
  const dark = useSyncExternalStore(subscribeTheme, readTheme, readServerTheme) === 'dark'
  const note = SCENARIOS.find((candidate) => candidate.id === scenario)?.note ?? ''

  return (
    <motion.header
      className="sc-chrome"
      initial={reduced ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="text-[0.9375rem] font-semibold tracking-[-0.02em]">
            TechTech Flight
          </span>
          <span className="sc-label">Fleet · maximalist variant</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => writeTheme(dark ? 'light' : 'dark')}
            aria-label={`Switch to the ${dark ? 'lit-room' : 'darkened-room'} theme`}
          >
            {dark ? 'Lit room' : 'Dark room'}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/">The restrained board</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="sc-label">Showing</span>
        <div className="sc-segment" role="group" aria-label="Which Fleet State to show">
          {SCENARIOS.map((candidate) => {
            const active = candidate.id === scenario
            return (
              <button
                key={candidate.id}
                type="button"
                className="sc-segment__button"
                data-active={active || undefined}
                aria-pressed={active}
                onClick={() => onScenario(candidate.id)}
              >
                {active && (
                  <motion.span
                    layoutId="sc-scenario-pill"
                    className="sc-segment__pill"
                    transition={
                      reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 36 }
                    }
                  />
                )}
                {candidate.label}
              </button>
            )
          })}
        </div>
        <p className="m-0 text-[0.8125rem] text-[var(--sc-ink-muted)]">
          {note}
          {scenario === 'live' && liveUnavailable && (
            <>
              {' '}
              <strong className="font-semibold">
                No ground station on this machine. Start it with{' '}
                <code>npm run dev:ground-station</code>.
              </strong>
            </>
          )}
        </p>
      </div>
    </motion.header>
  )
}
