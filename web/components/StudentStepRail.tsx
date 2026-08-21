import {
  STUDENT_STEPS,
  studentStepState,
  type StudentStepState,
} from '@/lib/student-steps'
import { cn } from '@/lib/utils'

/**
 * The twelve steps down the side of a Student's tablet.
 *
 * A step that has **already happened** can be tapped and re-read (ADR-0031). A later step is
 * not a link, not a button and not focusable (ADR-0028).
 *
 * The two halves rest on the same sentence. A Student never chooses what happens *next*, so a
 * rail that offered a later step would be offering a choice that does not exist, and a child
 * who pressed *Land* and watched nothing happen has learned that the screen lies. Looking back
 * at what already happened asks for nothing and moves nothing: it is memory, and refusing it
 * meant a child who could not re-read the rules asked the Teacher instead, mid-lesson, holding
 * a drone.
 *
 * ADR-0025's two-press rule is untouched. Those two are Mission presses; these are not, in
 * exactly the way joining and leaving are not, and they sit in the rail rather than on the
 * stage so the count of things on the Student's screen has not moved.
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
  reading = null,
  onLookBack,
  onBackToNow,
}: {
  /** Which of the twelve, 1 to 12. Where the lesson actually is, not what is being read. */
  readonly current: number
  readonly name: string
  readonly droneName: string | null
  readonly teamName?: string | null
  /** The earlier step being re-read, or null when the child is looking at now. */
  readonly reading?: number | null
  /** Absent where looking back makes no sense, and then no row is pressable at all. */
  readonly onLookBack?: ((step: number) => void) | undefined
  readonly onBackToNow?: (() => void) | undefined
}) {
  return (
    <aside
      aria-label="Where you are in the lesson"
      className="flex flex-col gap-3 border-hairline bg-surface-1 p-4 max-[46rem]:border-b min-[46rem]:w-60 min-[46rem]:border-r"
    >
      {/*
       * The name is large and it stays large, on every screen including the two takeovers
       * that carry nothing else. A child looking at somebody else's name for forty minutes
       * will say so, and that correction is the reason there is no Student PIN.
       */}
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-heading font-medium text-balance text-ink">
          {name}
        </span>
        <span className="text-value text-ink-subtle">
          {[teamName, droneName].filter(Boolean).join(', ') || 'No Drone yet'}
        </span>
      </div>

      {/*
       * Phone width wraps. It does not scroll sideways, and a chip is as wide as its label,
       * so Connect is never clipped to Co. A horizontal scroller plus full-width chips was
       * the truncation; a scroller that is not a positioning context was the 856px swipe
       * (sr-only is position absolute). relative stays so a future overflow cannot
       * reintroduce it. web/scroll-containers.test.ts refuses a scroller with no
       * positioning context.
       */}
      <ol className="relative m-0 flex list-none flex-col gap-0.5 p-0 max-[46rem]:flex-row max-[46rem]:flex-wrap">
        {STUDENT_STEPS.map((label, index) => {
          const step = index + 1
          const state = studentStepState(step, current)
          const canLookBack = state === 'done' && onLookBack !== undefined
          const beingRead = reading === step

          const row = (
            <>
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
            </>
          )

          const shape = cn(
            'flex shrink-0 items-baseline gap-2 rounded-surface px-2 py-1.5 text-left text-value min-[46rem]:w-full',
            state === 'now' &&
              'bg-brand-wash font-semibold text-ink shadow-[inset_2px_0_0_var(--color-brand)]',
            state === 'done' && 'text-ink-subtle',
            state === 'ahead' && 'text-ink-muted',
            // Being re-read: outlined rather than filled, so the brand fill goes on meaning
            // "you are here" and nothing else.
            beingRead && 'outline outline-2 outline-offset-[-2px] outline-ink',
          )

          return (
            <li key={label} data-state={state} className="flex shrink-0">
              {canLookBack ? (
                <button
                  type="button"
                  onClick={() => onLookBack(step)}
                  aria-pressed={beingRead}
                  className={cn(shape, 'min-h-11 cursor-pointer border-0 bg-transparent hover:text-ink')}
                >
                  {row}
                </button>
              ) : (
                <span className={shape}>{row}</span>
              )}
            </li>
          )
        })}
      </ol>

      {/*
       * The way back to now, and it is not optional: a child who taps back and then waits for
       * a lesson that has not moved must be able to return without waiting for it. The screen
       * also returns by itself the instant the step changes, and that is the half that keeps a
       * Teacher's answer from being hidden behind something a child chose to re-read.
       */}
      {reading !== null && onBackToNow !== undefined ? (
        <button
          type="button"
          onClick={onBackToNow}
          className="m-0 mt-auto min-h-11 cursor-pointer rounded-pill border border-hairline bg-canvas px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Back to now
        </button>
      ) : (
        <p className="m-0 mt-auto border-t border-hairline pt-2 text-label text-ink-muted">
          {onLookBack === undefined
            ? 'Look only. Nothing here is pressable.'
            : 'Tap a step you have done to read it again.'}
        </p>
      )}
    </aside>
  )
}
