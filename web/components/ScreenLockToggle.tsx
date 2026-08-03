'use client'

import { cn } from '@/lib/utils'

/**
 * Locks Command controls so a pupil at the laptop cannot press Stop.
 *
 * Controlled — ControlScreen (Integrator) owns the boolean and passes
 * `commandLockState(locked)` into every Land / Hover / Stop control.
 */
export function ScreenLockToggle({
  locked,
  onChange,
}: {
  locked: boolean
  onChange: (locked: boolean) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={locked}
      onClick={() => onChange(!locked)}
      className={cn(
        'min-h-11 cursor-pointer rounded-pill border px-4 py-1.5 text-value',
        locked
          ? 'border-ink bg-ink font-medium text-canvas'
          : 'border-hairline bg-transparent text-ink-muted hover:border-ink hover:text-ink',
      )}
    >
      {locked ? 'Screen locked' : 'Lock screen'}
    </button>
  )
}
