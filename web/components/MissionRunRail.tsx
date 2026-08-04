'use client'

import Link from 'next/link'
import {
  RUN_STEP_PHASES,
  RUN_STEPS,
  runStep,
  runStepMark,
  type RunStepInput,
  type RunStepPhase,
} from '@/lib/run-step'
import { cn } from '@/lib/utils'

/**
 * Left Mission run rail — the twelve ATC steps, top to bottom.
 *
 * The top SiteNav still names rooms (Control, Lesson, Reports). This rail is the Mission
 * workflow itself: one click per Photo 3 step, current step derived from records (same as
 * the Run bar), so a Teacher can walk the day without hunting across screens.
 *
 * Shown only while a Lesson is open. On a narrow board it becomes a horizontal strip so
 * the steps stay reachable without eating the instrument.
 */
export function MissionRunRail({
  state,
  className,
}: {
  readonly state: RunStepInput
  readonly className?: string
}) {
  const reading = runStep(state)

  return (
    <nav
      aria-label="Mission run steps"
      className={cn(
        'mission-run-rail flex flex-col gap-3 border-hairline bg-surface-1',
        'max-[59.99rem]:border-b max-[59.99rem]:px-3 max-[59.99rem]:py-3',
        'min-[60rem]:sticky min-[60rem]:top-[4.5rem] min-[60rem]:h-[calc(100dvh-5rem)] min-[60rem]:w-[16.5rem] min-[60rem]:shrink-0 min-[60rem]:overflow-y-auto min-[60rem]:border-r min-[60rem]:px-3 min-[60rem]:py-4',
        className,
      )}
    >
      <div className="flex flex-col gap-1 px-1">
        <p className="label m-0 text-ink-muted">Mission run</p>
        <p className="m-0 font-display text-heading font-medium text-ink">
          Step <span className="tnum">{reading.step}</span> of{' '}
          <span className="tnum">{reading.totalSteps}</span>
        </p>
        <p className="m-0 text-value text-ink-subtle">{reading.nextAction}</p>
      </div>

      <ol className="m-0 flex list-none flex-col gap-4 p-0 max-[59.99rem]:flex-row max-[59.99rem]:gap-3 max-[59.99rem]:overflow-x-auto">
        {RUN_STEP_PHASES.map((phase) => (
          <PhaseGroup
            key={phase.id}
            phase={phase.id}
            label={phase.label}
            current={reading.step}
          />
        ))}
      </ol>
    </nav>
  )
}

function PhaseGroup({
  phase,
  label,
  current,
}: {
  readonly phase: RunStepPhase
  readonly label: string
  readonly current: number
}) {
  const steps = RUN_STEPS.filter((step) => step.phase === phase)

  return (
    <li className="flex min-w-0 flex-col gap-1.5 max-[59.99rem]:min-w-[14rem]">
      <p className="label m-0 px-1 text-ink-muted">{label}</p>
      <ol className="m-0 flex list-none flex-col gap-1 p-0">
        {steps.map((step) => {
          const mark = runStepMark(step.step, current)
          return (
            <li key={step.step}>
              <Link
                href={step.href}
                prefetch={false}
                aria-current={mark === 'current' ? 'step' : undefined}
                className={cn(
                  'flex min-h-11 items-start gap-2 rounded-surface px-2 py-1.5 no-underline transition-colors',
                  mark === 'current' && 'bg-ink text-canvas',
                  mark === 'done' && 'text-ink-muted hover:bg-canvas hover:text-ink',
                  mark === 'upcoming' && 'text-ink-subtle hover:bg-canvas hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'tnum mt-0.5 inline-flex min-w-[1.5rem] shrink-0 text-value font-medium',
                    mark === 'current' ? 'text-canvas' : 'text-ink-muted',
                  )}
                  aria-hidden="true"
                >
                  {step.step}
                </span>
                <span className="min-w-0 text-value leading-snug">{step.label}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </li>
  )
}
