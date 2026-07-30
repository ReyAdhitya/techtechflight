'use client'

import { useTrainingWheelsOptional } from '@/lib/training-wheels'
import { cn } from '@/lib/utils'

/**
 * Visible practice-mode banner on Control and Lesson.
 */
export function TrainingWheelsBanner({ className }: { readonly className?: string }) {
  const wheels = useTrainingWheelsOptional()
  if (!wheels?.enabled) return null

  return (
    <p
      role="status"
      className={cn(
        'm-0 rounded-surface border border-status-not-ready bg-surface-1 px-4 py-2 text-value text-status-not-ready',
        className,
      )}
    >
      Training wheels — practice mode. Stop is hidden and alert styling is softened until you
      turn this off.
    </p>
  )
}

/**
 * Toggle stored in localStorage — survives refresh on this laptop.
 */
export function TrainingWheelsToggle() {
  const wheels = useTrainingWheelsOptional()
  if (!wheels) return null

  return (
    <button
      type="button"
      aria-pressed={wheels.enabled}
      onClick={wheels.toggle}
      className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
    >
      {wheels.enabled ? 'Training wheels on' : 'Training wheels off'}
    </button>
  )
}
