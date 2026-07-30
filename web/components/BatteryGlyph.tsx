import { cn } from '@/lib/utils'

/**
 * Compact iPhone-style battery outline with a fill that tracks charge fraction.
 *
 * Decorative beside the numeric reading — keep the percentage text for the real value.
 */
export function BatteryGlyph({
  fraction,
  low = false,
  className,
}: {
  readonly fraction: number
  readonly low?: boolean
  readonly className?: string
}) {
  const clamped = Math.max(0, Math.min(1, fraction))
  const fillWidth = Math.max(clamped > 0 ? 1.5 : 0, 18 * clamped)

  return (
    <svg
      viewBox="0 0 28 14"
      width="1.25rem"
      height="0.7rem"
      className={cn(
        'shrink-0',
        low ? 'text-status-not-ready' : 'text-ink-subtle',
        className,
      )}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="0.75"
        y="1.25"
        width="21.5"
        height="11.5"
        rx="2.5"
        ry="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <rect x="23.25" y="4.25" width="3.25" height="5.5" rx="1" fill="currentColor" />
      {fillWidth > 0 && (
        <rect
          x="2.5"
          y="3"
          width={fillWidth}
          height="8"
          rx="1.25"
          fill="currentColor"
          data-testid="battery-glyph-fill"
        />
      )}
    </svg>
  )
}
