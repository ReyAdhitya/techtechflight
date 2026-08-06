'use client'

import { useEffect, useState } from 'react'
import {
  readSafetyBrief,
  resetSafetyBrief,
  SAFETY_BRIEF_RULES,
  safetyBriefDoneCount,
  toggleSafetyBriefRule,
  type SafetyBriefState,
} from '@/lib/safety-brief'
import { cn } from '@/lib/utils'

/**
 * Safety brief checklist for the class — fixed rules, tickable, reset each Lesson.
 *
 * Word and shape carry done/undone (tick mark + "Done" / "Still open"); colour alone never
 * does (ADR-0004). Mount with the running Lesson id so a new period clears last period's ticks.
 */
export function SafetyBriefPanel({
  lessonId,
}: {
  /** Running Lesson id, or null when none is under way. */
  readonly lessonId: string | null
}) {
  const [state, setState] = useState<SafetyBriefState>(() => readSafetyBrief(lessonId))

  useEffect(() => {
    setState(readSafetyBrief(lessonId))
  }, [lessonId])

  const done = safetyBriefDoneCount(state)
  const total = SAFETY_BRIEF_RULES.length

  return (
    <section
      className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5"
      aria-labelledby="safety-brief-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex flex-col gap-1">
          <h2 id="safety-brief-heading" className="label m-0">
            Safety brief
          </h2>
          <p className="m-0 text-value text-ink-subtle">
            Classroom rules before anyone takes off. Ticks clear when a new Lesson starts.
          </p>
        </div>
        <p className="m-0 text-value text-ink-subtle">
          <span className="tnum">{done}</span>
          {' of '}
          <span className="tnum">{total}</span>
          {' done'}
        </p>
      </div>

      {!lessonId ? (
        <p className="m-0 text-value text-ink-muted">
          Start a Lesson to keep ticks for this period. You can still walk the brief now.
          marks will not be kept until a Lesson is running.
        </p>
      ) : null}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {SAFETY_BRIEF_RULES.map((rule) => {
          const checked = state.checked[rule.id] === true
          return (
            <li key={rule.id}>
              <button
                type="button"
                onClick={() => setState(toggleSafetyBriefRule(lessonId, rule.id))}
                aria-pressed={checked}
                className={cn(
                  'flex w-full min-h-11 cursor-pointer items-start gap-3 rounded-sm border border-hairline bg-canvas px-3 py-2 text-left text-ink',
                  'hover:border-ink-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border text-caption',
                    checked
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-hairline bg-transparent text-transparent',
                  )}
                  aria-hidden="true"
                >
                  {checked ? '✓' : '·'}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-value font-medium text-ink">
                    {rule.label}
                  </span>
                  <span className="text-caption text-ink-muted">
                    {checked ? 'Done' : 'Still open'}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {done > 0 ? (
        <button
          type="button"
          onClick={() => setState(resetSafetyBrief(lessonId))}
          className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
        >
          Clear ticks
        </button>
      ) : null}
    </section>
  )
}
