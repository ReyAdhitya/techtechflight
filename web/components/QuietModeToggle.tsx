'use client'

import { cn } from '@/lib/utils'

/**
 * Hides Stop on Control strips when enabled — local UI only, not a Fleet Command.
 *
 * For demonstrations and quiet classrooms where the red Stop must not sit on every strip.
 */
export function QuietModeToggle({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'min-h-11 cursor-pointer rounded-pill border px-4 py-1.5 text-value',
        enabled
          ? 'border-ink bg-ink font-medium text-canvas'
          : 'border-hairline bg-transparent text-ink-muted hover:border-ink hover:text-ink',
      )}
    >
      Quiet mode
    </button>
  )
}
