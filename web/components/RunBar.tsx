import { runStep, type RunStepInput } from '@/lib/run-step'
import { cn } from '@/lib/utils'

/**
 * The Run bar — one step of twelve and the single next action.
 *
 * Derived from Mission state, not a tour script. Mount on the app frame while a Lesson
 * runs (#532); the Integrator wires flags from Lesson, Control and Reports.
 */
export function RunBar({
  state,
  className,
}: {
  readonly state: RunStepInput
  readonly className?: string
}) {
  const { step, totalSteps, label, nextAction } = runStep(state)

  return (
    <section
      className={cn(
        'run-bar flex flex-col gap-1 rounded-surface border border-hairline bg-surface-1 px-4 py-3',
        className,
      )}
      aria-labelledby="run-bar-heading"
    >
      <h2 id="run-bar-heading" className="m-0 font-display text-heading text-ink">
        Step <span className="tnum">{step}</span> of <span className="tnum">{totalSteps}</span>
        {' — '}
        {label}
      </h2>
      <p className="m-0 text-value text-ink-subtle">{nextAction}</p>
    </section>
  )
}
