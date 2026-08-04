import { cn } from '@/lib/utils'

/**
 * Checkpoint progress beside the Mission objective on a flight strip.
 *
 * Mount on Control strips during a Mission; Integrator wires ControlScreen. Does not
 * reorder strips (DELIBERATE-POSITIONS 1).
 */
export function CheckpointProgress({
  reached,
  required,
  className,
}: {
  readonly reached: number
  readonly required: number
  readonly className?: string
}) {
  const label =
    required === 0 ? 'No checkpoints' : `${reached} of ${required} checkpoints`

  return (
    <span
      role="status"
      aria-label={label}
      className={cn('tnum text-value text-ink-subtle', className)}
    >
      {label}
    </span>
  )
}
