import {
  STUDENT_STEPS,
  studentStepState,
  type StudentStepState,
} from '@/lib/student-steps'
import { cn } from '@/lib/utils'

/**
 * The twelve steps down the side of a Student's tablet, and **not one of them is pressable**.
 *
 * ADR-0028. No link, no button, nothing focusable: a Student never chooses what happens
 * next, so a rail that answered a press would be offering a choice that does not exist, and
 * a child who pressed *Land* on it and watched nothing happen has learned that the screen
 * lies. It is also what keeps ADR-0025's two-press rule true, because fourteen pressable
 * things of which twelve do nothing is not two.
 *
 * An `<ol>` of text. It is announced as a list, which is what it is.
 */

const MARK: Readonly<Record<StudentStepState, string>> = {
  done: 'Done',
  now: 'You are here',
  ahead: 'Still to come',
}

export function StudentStepRail({
  current,
  name,
  droneName,
  teamName,
}: {
  /** Which of the twelve, 1 to 12. */
  readonly current: number
  readonly name: string
  readonly droneName: string | null
  readonly teamName?: string | null
}) {
  return (
    <aside
      aria-label="Where you are in the lesson"
      className="flex flex-col gap-3 border-hairline bg-surface-1 p-4 max-[46rem]:border-b min-[46rem]:w-60 min-[46rem]:border-r"
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-body font-medium text-ink">{name}</span>
        <span className="text-label text-ink-muted">
          {[teamName, droneName].filter(Boolean).join(', ') || 'No Drone yet'}
        </span>
      </div>

      <ol className="m-0 flex list-none flex-col gap-0.5 p-0 max-[46rem]:flex-row max-[46rem]:overflow-x-auto">
        {STUDENT_STEPS.map((label, index) => {
          const step = index + 1
          const state = studentStepState(step, current)
          return (
            <li
              key={label}
              data-state={state}
              className={cn(
                'flex shrink-0 items-baseline gap-2 rounded-surface px-2 py-1.5 text-value',
                state === 'now' && 'bg-brand-wash font-semibold text-ink shadow-[inset_2px_0_0_var(--color-brand)]',
                state === 'done' && 'text-ink-subtle',
                state === 'ahead' && 'text-ink-muted',
              )}
            >
              {/*
               * The mark in a word for anything that cannot see the fill, because colour is
               * never the only channel (ADR-0004). A tick and a number are both decoration
               * once the word is there.
               */}
              <span className="sr-only">{MARK[state]}. </span>
              <span aria-hidden="true" className="tnum text-label">
                {state === 'done' ? '✓' : step}
              </span>
              <span>{label}</span>
            </li>
          )
        })}
      </ol>

      <p className="m-0 mt-auto border-t border-hairline pt-2 text-label text-ink-muted">
        Look only. Nothing here is pressable.
      </p>
    </aside>
  )
}
