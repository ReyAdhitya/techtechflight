import type { ConnectionStatus } from '@/lib/fleet-connection'
import { cn } from '@/lib/utils'

/**
 * Says when the board itself cannot reach the ground station.
 *
 * A broken dashboard and a cupboard full of switched-off Drones must never look the
 * same, so this speaks about the board rather than about any Drone. It stays clear of
 * the Status vocabulary entirely — not just Offline, but the words the glossary bars as
 * synonyms for it, so that nothing here can be misread as something about a Drone.
 *
 * It is named, because the board has a second live region — the Needs Attention count —
 * and an unnamed pair leaves a Teacher hearing an announcement with no way to tell
 * whether it was about a Drone or about the board. The name observes the same rule as
 * the words below it and stays clear of the Status vocabulary.
 */
export interface ConnectionBannerProps {
  readonly connection: ConnectionStatus
  /** True when what's on screen is a stand-in Fleet, not one the ground station sent. */
  readonly demo?: boolean
}

export function ConnectionBanner({ connection, demo = false }: ConnectionBannerProps) {
  /*
   * A stand-in Fleet must never pass for real telemetry. Keep the notice compact and
   * neutral, but visible: a Vercel preview is useful only if whoever opens it can tell
   * that the Drones underneath are examples.
   */
  if (demo) {
    return (
      <div
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-surface border border-hairline bg-muted px-4 py-3 text-ink"
        role="status"
        aria-label="Demonstration mode"
        data-connection="demo"
      >
        <strong className="text-body font-medium">Demonstration Fleet</strong>
        <span className="text-value text-ink-muted">
          Sample classroom data — not live Drone telemetry.
        </span>
      </div>
    )
  }

  if (connection === 'live') return null

  const connecting = connection === 'connecting'

  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-surface border px-4 py-3',
        // Connecting is an expected first moment, not a problem — it stays monochrome.
        // Losing a ground station mid-lesson is the exception colour exists for.
        connecting
          ? 'border-hairline bg-surface-1 text-ink-muted'
          : 'border-status-fault bg-surface-1 text-ink',
      )}
      role="status"
      aria-label="Ground station connection"
      data-connection={connection}
    >
      <strong className="text-body font-medium">
        {connecting
          ? 'Connecting to the ground station'
          : 'This board cannot reach the ground station'}
      </strong>
      <span className="text-value text-ink-muted">
        {connecting
          ? 'Waiting for the first Fleet State.'
          : 'What you see below is the last thing it told us. Trying to reconnect.'}
      </span>
    </div>
  )
}
