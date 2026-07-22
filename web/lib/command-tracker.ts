import type { CommandKind, CommandOutcomeMessage, DroneCommand, DroneId } from '@techtechflight/contract'
import type { DroneVitals } from './vitals'

/**
 * What the Teacher has asked for, and what has come of it.
 *
 * Three separate facts, and the whole point of this module is that they are not collapsed
 * into one. A Command has been *sent*; the Fleet has *taken or refused* it; and the Drone
 * has been *seen to do it*. Only the third is the aircraft doing anything, and only the
 * third may ever read as done.
 *
 * A board that showed "Landed" the moment a button was pressed would be inventing the one
 * fact a Teacher is standing in the room to check. A Command that produced no change has
 * to look exactly like a Command that produced no change.
 */

/** Long enough for a Drone to have begun doing something, short enough to be worth saying. */
export const RESPONSE_WINDOW_MS = 10_000

export type CommandStage =
  /** Handed to the Fleet, nothing back yet. */
  | 'sent'
  /** The Fleet took it. Still no evidence the aircraft did. */
  | 'waiting'
  /** Telemetry shows it happened. */
  | 'done'
  /** The Fleet would not carry it, and said why. */
  | 'refused'
  /** Taken, and nothing has changed since. Not failed — unknown. */
  | 'no-response'

export interface TrackedCommand {
  readonly command: DroneCommand
  readonly stage: CommandStage
  readonly reason: string | null
}

/** Whether Telemetry now shows what was asked for. Absence of evidence, never inference. */
function satisfied(kind: CommandKind, vitals: DroneVitals): boolean {
  switch (kind) {
    case 'land':
    case 'auto-land':
      return !vitals.airborne
    case 'emergency-stop':
      return vitals.phase === 'emergency'
    case 'hold':
      // Not climbing and not descending. A Drone that landed instead also counts: it is
      // not going anywhere vertically, which is what was asked.
      return !vitals.airborne || vitals.phase === 'level'
  }
}

export class CommandTracker {
  readonly #latest = new Map<DroneId, TrackedCommand>()

  issue(command: DroneCommand): void {
    this.#latest.set(command.droneId, { command, stage: 'sent', reason: null })
  }

  record(outcome: CommandOutcomeMessage): void {
    for (const [droneId, tracked] of this.#latest) {
      if (tracked.command.id !== outcome.commandId) continue
      this.#latest.set(droneId, {
        command: tracked.command,
        stage: outcome.outcome === 'refused' ? 'refused' : 'waiting',
        reason: outcome.reason,
      })
    }
  }

  /**
   * Read the Fleet for evidence, rather than assuming.
   *
   * A Command the aircraft has visibly carried out becomes done. One that has not, after
   * long enough to have started, says so — and says it as "no response", because a Drone
   * that ignored a request and a Drone that stopped talking are not distinguishable from
   * here and must not be described as though they were.
   */
  observe(vitals: readonly DroneVitals[], now: number): void {
    for (const entry of vitals) {
      const tracked = this.#latest.get(entry.droneId)
      if (tracked === undefined) continue
      if (tracked.stage === 'refused' || tracked.stage === 'done') continue

      if (satisfied(tracked.command.kind, entry)) {
        this.#latest.set(entry.droneId, { ...tracked, stage: 'done' })
        continue
      }

      if (now - tracked.command.issuedAt > RESPONSE_WINDOW_MS) {
        this.#latest.set(entry.droneId, { ...tracked, stage: 'no-response' })
      }
    }
  }

  latestFor(droneId: DroneId): TrackedCommand | null {
    return this.#latest.get(droneId) ?? null
  }

  /** Stop mentioning a Command once it has plainly finished, so a strip does not accrete. */
  forget(droneId: DroneId): void {
    this.#latest.delete(droneId)
  }

  reset(): void {
    this.#latest.clear()
  }
}
