'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ConnectionStatus } from '@/lib/fleet-connection'

/**
 * Says when the board itself cannot reach the ground station.
 *
 * A broken board and a cupboard full of switched-off Drones must never look the same,
 * so this speaks about the board and stays entirely clear of the Status vocabulary —
 * not just Offline, but every word `CONTEXT.md` bars as a synonym for it.
 *
 * The pulse is the one place a maximalist treatment is unambiguously better than a
 * static panel: a Teacher facing the room sees that something is wrong with the board
 * without reading it. It is also the one place it is most dangerous, which is why the
 * connecting state stays quiet — a first connection is not a problem, and animating it
 * would spend the alarm on the normal case.
 */
export function ConnectionStrip({ connection }: { connection: ConnectionStatus }) {
  const reduced = useReducedMotion()

  return (
    <AnimatePresence initial={false}>
      {connection !== 'live' && (
        <motion.div
          key={connection}
          className="sc-connection"
          data-connection={connection}
          role="status"
          aria-label="Ground station connection"
          initial={reduced ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          {...(reduced ? {} : { exit: { opacity: 0, height: 0 } })}
          transition={reduced ? { duration: 0 } : { duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="sc-connection__dot" aria-hidden="true" />
          <div className="flex flex-col gap-0.5">
            <strong className="text-[length:var(--sc-text-sm)] font-semibold">
              {connection === 'connecting'
                ? 'Connecting to the ground station'
                : 'This board cannot reach the ground station'}
            </strong>
            <span className="text-sm text-[var(--sc-ink-muted)]">
              {connection === 'connecting'
                ? 'Waiting for the first Fleet State.'
                : 'What you see below is the last thing it told us, and it is getting older. Trying to reconnect.'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
