import type { DroneState } from '@techtechflight/contract'
import {
  missingCraftSinceLastLesson,
  type ClosedLessonCraftSource,
  type MissingCraft,
} from '@/lib/missing-craft'
import { cn } from '@/lib/utils'

/**
 * Names craft that flew the last closed Lesson and have not come back.
 *
 * Silent when every prior craft is still in contact — an alert that arrives, not a
 * counter that sits at zero. Mount on the Fleet / prep screen.
 */
export function MissingCraftNotice({
  lastClosedLesson,
  drones,
  className,
}: {
  readonly lastClosedLesson: ClosedLessonCraftSource | null
  readonly drones: readonly DroneState[]
  readonly className?: string
}) {
  const missing = missingCraftSinceLastLesson(lastClosedLesson, drones)
  return (
    <MissingCraftNoticeView
      missing={missing}
      {...(className !== undefined ? { className } : {})}
    />
  )
}

/** Presentational form — useful when the Integrator has already computed the list. */
export function MissingCraftNoticeView({
  missing,
  className,
}: {
  readonly missing: readonly MissingCraft[]
  readonly className?: string
}) {
  if (missing.length === 0) return null

  const names = missing.map((craft) => craft.name).join(', ')
  const label =
    missing.length === 1
      ? `${missing[0]!.name} did not come back since the last Lesson`
      : `${names} did not come back since the last Lesson`

  return (
    <p
      role="alert"
      aria-label={label}
      className={cn(
        'm-0 rounded-surface border border-status-not-ready bg-surface-1 px-4 py-2 text-value text-status-not-ready',
        className,
      )}
    >
      <span className="font-medium">Missing since last Lesson.</span>{' '}
      {missing.length === 1 ? (
        <>
          <span className="font-medium text-ink">{missing[0]!.name}</span> did not come back.
        </>
      ) : (
        <>
          {missing.map((craft, index) => (
            <span key={craft.id}>
              {index > 0 ? ', ' : null}
              <span className="font-medium text-ink">{craft.name}</span>
            </span>
          ))}{' '}
          did not come back.
        </>
      )}
    </p>
  )
}
