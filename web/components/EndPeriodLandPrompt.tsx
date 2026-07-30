'use client'

/**
 * End-period land prompt when the lesson timer hits zero.
 * Sim: call ScenarioControls if land-all exists; else copy-only.
 */
export function EndPeriodLandPrompt({
  open,
  onClose,
  onLandAll,
}: {
  open: boolean
  onClose: () => void
  onLandAll: (() => void) | null
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-labelledby="end-period-title"
    >
      <div className="flex max-w-md flex-col gap-4 rounded-surface border border-hairline bg-canvas p-6">
        <h2 id="end-period-title" className="m-0 font-display text-summary font-medium text-ink">
          Period ending
        </h2>
        <p className="m-0 text-body text-ink-subtle">
          The lesson timer reached zero. Bring every craft down before the next class.
        </p>
        <div className="flex flex-wrap gap-2">
          {onLandAll ? (
            <button
              type="button"
              className="min-h-11 rounded-pill border border-status-fault px-4 py-1.5 text-caption text-status-fault"
              onClick={() => {
                onLandAll()
                onClose()
              }}
            >
              Land all (sim)
            </button>
          ) : null}
          <button
            type="button"
            className="min-h-11 rounded-pill border border-hairline px-4 py-1.5 text-caption text-ink"
            onClick={onClose}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
