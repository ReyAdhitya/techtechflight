import { cn } from '@/lib/utils'

/**
 * Absent versus Offline — two different facts that share a pill shape.
 *
 * **Absent** is a Student the Teacher marked as not in the room. **Offline** is a Drone
 * that has gone quiet on Telemetry. Colour and copy must not conflate them.
 */
const PRESENTATION = {
  absent: {
    label: 'Absent',
    className: 'border-status-not-ready text-status-not-ready',
  },
  offline: {
    label: 'Offline',
    className: 'border-status-offline text-status-offline',
  },
} as const

export function PresenceBadge({
  kind,
  className,
}: {
  readonly kind: keyof typeof PRESENTATION
  readonly className?: string
}) {
  const { label, className: tone } = PRESENTATION[kind]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill border px-2 py-0.5 text-value font-medium',
        tone,
        className,
      )}
    >
      {label}
    </span>
  )
}
