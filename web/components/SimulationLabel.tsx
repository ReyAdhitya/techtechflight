'use client'

import { useFleet } from './FleetProvider'

/**
 * Which Fleet the Teacher is looking at, said in words, always.
 *
 * Requirement C5, and it became a safety requirement rather than a courtesy the moment
 * the board could ask a Drone to land. It must never be possible to press Land and then
 * wonder whether a real aircraft in the room started coming down.
 *
 * Deliberately text, and deliberately not a badge or a coloured dot. The way a persistent
 * indicator fails is that the eye stops seeing it, and a symbol has nothing to fall back
 * on when that happens — which is the same reasoning ADR-0004 uses for never letting
 * colour carry a meaning by itself.
 */
export function SimulationLabel() {
  const { demo } = useFleet()
  if (!demo) return null

  return (
    <p className="simulation-label" role="status">
      Simulated Fleet — no aircraft are being contacted
    </p>
  )
}
