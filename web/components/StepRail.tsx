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
import { cn } from '@/lib/utils'

/**
 * The twelve steps of a Mission run, down the left, put away when they are in the way.
 *
 * The first rail was withdrawn for being a second navigation (DECISIONS, 2026-08-04). Two
 * things are different. It carries state the top bar cannot: each step reads as done,
 * current, live or locked, and a locked step says what is standing in the way. And it
 * minimises to a column of numbers, so a Teacher who knows the day can have the width back.
 *
 * Nothing here decides anything. Marks come from `mission-flow`, which reads records.
 */

/** How each mark reads, in words. Colour is never the only channel (ADR-0006). */
const MARK_WORDS: Readonly<Record<MissionStepMark, string>> = {
  done: 'Done',
  current: 'You are here',
  live: 'Happening now',
  locked: 'Not open yet',
}

function StepGlyph({ mark, step }: { readonly mark: MissionStepMark; readonly step: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'tnum inline-grid size-7 shrink-0 place-items-center rounded-pill border font-display text-label font-medium',
        mark === 'done' && 'border-ink bg-ink text-canvas',
        mark === 'current' && 'border-ink text-ink',
        mark === 'live' && 'border-status-flying border-dashed text-ink',
        mark === 'locked' && 'border-hairline text-ink-muted',
      )}
    >
      {mark === 'done' ? '✓' : step}
    </span>
  )
}

function StepRow({
  step,
  facts,
  active,
}: {
  readonly step: MissionFlowStep
  readonly facts: MissionFlowFacts
  readonly active: boolean
}) {
  const mark = missionStepMark(step.step, facts)
  const blockedBy = missionStepBlockedBy(step.step, facts)
  const state = blockedBy ?? (active ? MARK_WORDS.current : MARK_WORDS[mark])

  return (
    <li>
      <Link
        href={step.href}
        /* A static export has no RSC payload behind a route, so prefetch only 404s. */
        prefetch={false}
        aria-current={active ? 'step' : undefined}
        title={`${step.step}. ${step.label} · ${state}`}
        className={cn(
          'step-rail__step flex min-h-11 items-center gap-3 rounded-surface px-2 py-1.5 no-underline',
          'hover:bg-canvas',
          active && 'bg-canvas',
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
  activeStep,
  lessonName,
  open,
  onToggle,
  className,
}: {
  readonly facts: MissionFlowFacts
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
  const stepNow = MISSION_FLOW_STEPS[current - 1]

  return (
    <nav
      aria-label="Mission steps"
      data-open={open ? 'true' : 'false'}
      className={cn(
        'step-rail flex flex-col gap-2 self-start rounded-surface border border-hairline bg-surface-1 p-2',
        className,
      )}
    >
      <div className="flex items-center gap-2 px-1">
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
        className="h-0.5 overflow-hidden rounded-pill bg-canvas"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={MISSION_STEP_COUNT}
        aria-label="Mission run progress"
      >
        <span
          className="block h-full bg-ink transition-[width] duration-[--chrome-duration] ease-[--chrome-ease]"
          style={{ width: `${(done / MISSION_STEP_COUNT) * 100}%` }}
        />
      </div>

      {stepNow ? (
        <p className="step-rail__text m-0 border-t border-hairline px-1 pt-2 text-label text-ink-subtle">
          {stepNow.nextAction}
        </p>
      ) : null}

      {MISSION_FLOW_PHASES.map((phase) => (
        <div key={phase.id} className="flex flex-col gap-1">
          <p className="step-rail__phase label m-0 px-1 pt-1">{phase.label}</p>
          <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
            {MISSION_FLOW_STEPS.filter((step) => step.phase === phase.id).map((step) => (
              <StepRow
                key={step.step}
                step={step}
                facts={facts}
                active={step.step === current}
              />
            ))}
          </ol>
        </div>
      ))}
    </nav>
  )
}
