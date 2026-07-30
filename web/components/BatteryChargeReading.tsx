import { formatBattery } from '@/lib/battery'
import {
  formatBatteryTimeBudget,
  isLowBatteryBudget,
} from '@/lib/battery-budget'
import { cn } from '@/lib/utils'
import { BatteryGlyph } from './BatteryGlyph'

/**
 * Charge reading for Control strips — glyph + percent + time budget.
 */
export function BatteryChargeReading({
  fraction,
  className,
}: {
  readonly fraction: number | null
  readonly className?: string
}) {
  if (fraction === null) {
    return (
      <span className={cn('tnum text-value text-ink-subtle', className)}>
        Charge not reported
      </span>
    )
  }

  const low = isLowBatteryBudget(fraction)
  const label = `${formatBattery(fraction)} · ${formatBatteryTimeBudget(fraction)}`

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 tnum text-value',
        low ? 'text-status-not-ready' : 'text-ink-subtle',
        className,
      )}
      aria-label={`Battery ${label}`}
    >
      <BatteryGlyph fraction={fraction} low={low} />
      <span aria-hidden="true">{label}</span>
    </span>
  )
}
