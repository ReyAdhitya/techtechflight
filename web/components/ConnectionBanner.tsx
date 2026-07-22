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
export function ConnectionBanner({ connection }: { connection: ConnectionStatus }) {
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
