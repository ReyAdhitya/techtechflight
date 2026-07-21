import type { ConnectionStatus } from '../fleet-connection.ts'

/**
 * Says when the board itself cannot reach the ground station.
 *
 * A broken dashboard and a cupboard full of switched-off Drones must never look the
 * same, so this speaks about the board rather than about any Drone. It stays clear of
 * the Status vocabulary entirely — not just Offline, but the words the glossary bars as
 * synonyms for it, so that nothing here can be misread as something about a Drone.
 */
export function ConnectionBanner({ connection }: { connection: ConnectionStatus }) {
  if (connection === 'live') return null

  const connecting = connection === 'connecting'

  return (
    <div className="connection" role="status" data-connection={connection}>
      <strong className="connection__headline">
        {connecting
          ? 'Connecting to the ground station'
          : 'This board cannot reach the ground station'}
      </strong>
      <span className="connection__detail">
        {connecting
          ? 'Waiting for the first Fleet State.'
          : 'What you see below is the last thing it told us. Trying to reconnect.'}
      </span>
    </div>
  )
}
