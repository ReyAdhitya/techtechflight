'use client'

import Link from 'next/link'
import {
  MISSION_FLOW_PHASES,
  MISSION_FLOW_STEPS,
  MISSION_STEP_COUNT,
  currentMissionStep,
  missionStepBlockedBy,
  missionStepMark,
  missionStepsDone,
  type MissionFlowFacts,
  type MissionFlowStep,
  type MissionStepMark,
} from '@/lib/mission-flow'
import {
  missionStepDone,
  noMissionSummaryYet,
  type MissionFlowSummary,
} from '@/lib/mission-flow-summary'
import { cn } from '@/lib/utils'

/**
 * The twelve steps of a Mission run, down the left, put away when they are in the way.
 *
 * This is the navigation on the Mission run page rather than a column beside one (ADR-0026).
 * Two rails were withdrawn before it for being a second navigation; what changed is that the
 * seven-item top bar collapsed instead. Each step reads as done, current, live or locked, a
 * locked step says what is standing in the way, and a finished step says what it decided.
 * It minimises to a column of numbers, so a Teacher who knows the day can have the width back.
 *
 * Nothing here decides anything. Marks come from `mission-flow`, which reads records, and
 * the words for a finished step come from `mission-flow-summary`, which counts them.
 */

/** How each mark reads, in words. Colour is never the only channel (ADR-0004). */
const MARK_WORDS: Readonly<Record<MissionStepMark, string>> = {
  done: 'Done',
  current: 'You are here',
  live: 'Happening now',
  locked: 'Not open yet',
}

/*
 * The marigold does the work here, which is a deviation worth naming. Chrome on this board
 * is normally kept off the brand so it cannot compete with a Fault colour on a tile
 * (globals.css, Sections). A step dot is a few millimetres of fill in a rail a Teacher is
 * reading deliberately rather than glancing at, and the alternative was ink on ink: done
 * and current became the same shape in a different weight, which is the one distinction
 * the rail exists to make.
 */
function StepGlyph({ mark, step }: { readonly mark: MissionStepMark; readonly step: number }) {
  return (
    <span
      className={cn(
        'tnum inline-grid size-7 shrink-0 place-items-center rounded-pill border bg-canvas font-display text-label font-medium',
        mark === 'done' && 'border-brand bg-brand text-primary-foreground',
        mark === 'current' && 'border-brand text-ink ring-3 ring-brand-wash',
        mark === 'live' && 'border-info border-dashed text-ink',
        mark === 'locked' && 'border-hairline text-ink-muted',
      )}
    >
      {/*
       * The mark in a word, for anything that cannot see the fill. The rail says done with
       * marigold and live with a dashed info ring, and neither is allowed to be the only
       * carrier (ADR-0004). Sighted readers get the same word in the hover title.
       */}
      <span className="sr-only">{MARK_WORDS[mark]}. </span>
      <span aria-hidden="true">{mark === 'done' ? '✓' : step}</span>
    </span>
  )
}

/**
 * How one row paints.
 *
 * Exactly one row reads as current, and it is the one the Teacher is looking at. The
 * records name a current step too, and the two are usually the same; when a Teacher looks
 * ahead down the rail they are not, and two rows both saying "You are here" is the rail
 * contradicting itself. The records' step then paints as not started, which is what it is.
 */
function rowMark(
  step: number,
  facts: MissionFlowFacts,
  active: boolean,
): MissionStepMark {
  if (active) return 'current'
  const mark = missionStepMark(step, facts)
  return mark === 'current' ? 'locked' : mark
}

/**
 * What the row reads under its name.
 *
 * Current says so. Anything else says what is standing in the way, or, when nothing is,
 * what the step decided. "Done" on its own is the version that made a Teacher open the
 * step to find out what they had chosen.
 */
function stateWords(
  step: number,
  mark: MissionStepMark,
  facts: MissionFlowFacts,
  summary: MissionFlowSummary,
): string {
  if (mark === 'current') return MARK_WORDS.current
  return missionStepBlockedBy(step, facts) ?? missionStepDone(step, summary)
}

function StepRow({
  step,
  facts,
  summary,
  active,
}: {
  readonly step: MissionFlowStep
  readonly facts: MissionFlowFacts
  readonly summary: MissionFlowSummary
  readonly active: boolean
}) {
  const mark = rowMark(step.step, facts, active)
  const state = stateWords(step.step, mark, facts, summary)

  return (
    <li>
      <Link
        href={step.href}
        /* A static export has no RSC payload behind a route, so prefetch only 404s. */
        prefetch={false}
        aria-current={active ? 'step' : undefined}
        title={`${step.step}. ${step.label}, ${state}`}
        className={cn(
          'step-rail__step flex min-h-11 items-center gap-3 rounded-surface px-2 py-1.5 no-underline',
          'hover:bg-muted',
          active && 'bg-brand-wash',
        )}
      >
        <StepGlyph mark={mark} step={step.step} />
        <span className="step-rail__text flex min-w-0 flex-col">
          <span
            className={cn(
              'truncate text-value',
              mark === 'locked' ? 'text-ink-muted' : 'text-ink',
              active && 'font-medium',
            )}
          >
            {step.label}
          </span>
          <span className="truncate text-label text-ink-muted">{state}</span>
        </span>
      </Link>
    </li>
  )
}

export function StepRail({
  facts,
  summary,
  activeStep,
  lessonName,
  open,
  onToggle,
  className,
}: {
  readonly facts: MissionFlowFacts
  /** Counts behind the done strings. Defaults to a board where nothing has happened. */
  readonly summary?: MissionFlowSummary
  /** The step this screen is showing. Defaults to whatever the records say. */
  readonly activeStep?: number
  /** The running Lesson, so the rail says whose day this is. */
  readonly lessonName?: string | null
  readonly open: boolean
  readonly onToggle: () => void
  readonly className?: string
}) {
  const current = activeStep ?? currentMissionStep(facts)
  const done = missionStepsDone(facts)
  const counted = summary ?? noMissionSummaryYet()

  return (
    <nav
      aria-label="Mission steps"
      data-open={open ? 'true' : 'false'}
      className={cn(
        'step-rail flex flex-col self-start rounded-surface border border-hairline bg-surface-1',
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-hairline px-3.5 pb-3 pt-3.5">
        <span className="step-rail__text flex min-w-0 flex-col">
          <span className="label truncate">{lessonName ?? 'Mission run'}</span>
          <span className="tnum whitespace-nowrap font-display text-value font-medium text-ink">
            {done} of {MISSION_STEP_COUNT} done
          </span>
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={cn(
            'step-rail__toggle ml-auto inline-grid size-9 shrink-0 cursor-pointer place-items-center',
            'rounded-surface border border-hairline bg-transparent text-ink-subtle hover:border-ink hover:text-ink',
          )}
        >
          <span className="sr-only">
            {open ? 'Minimise the Mission steps' : 'Maximise the Mission steps'}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 3 5 8l5 5" />
          </svg>
        </button>
      </div>

      {/*
       * How far through, as a bar as well as a count. Twelve steps is more than a Teacher
       * holds in their head, and "6 of 12" read at a glance across a classroom is a pair
       * of digits before it is a proportion.
       */}
      <div
        className="h-[3px] overflow-hidden bg-muted"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={MISSION_STEP_COUNT}
        aria-label="Mission run progress"
      >
        <span
          className="block h-full bg-brand transition-[width] duration-[--chrome-duration] ease-[--chrome-ease]"
          style={{ width: `${(done / MISSION_STEP_COUNT) * 100}%` }}
        />
      </div>

      <div className="flex flex-col p-2 pb-3">
        {MISSION_FLOW_PHASES.map((phase) => (
          <div key={phase.id} className="flex flex-col">
            <p className="step-rail__phase label m-0 px-2 pb-1.5 pt-3">{phase.label}</p>
            <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
              {MISSION_FLOW_STEPS.filter((step) => step.phase === phase.id).map((step) => (
                <StepRow
                  key={step.step}
                  step={step}
                  facts={facts}
                  summary={counted}
                  active={step.step === current}
                />
              ))}
            </ol>
          </div>
        ))}
      </div>
    </nav>
  )
}
