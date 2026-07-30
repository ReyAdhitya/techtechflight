import type { DroneVitals } from '@/lib/vitals'

/** End-lesson board vocabulary — landed or still airborne. */
export type LandedBoardLabel = 'Landed' | 'Still flying'

export interface LandedBoardPresentation {
  readonly label: LandedBoardLabel
  readonly className: string
  readonly borderClassName: string
}

export const LANDED_BOARD_PRESENTATION: Readonly<Record<LandedBoardLabel, LandedBoardPresentation>> =
  {
    Landed: {
      label: 'Landed',
      className: 'text-success',
      borderClassName: 'border-success',
    },
    'Still flying': {
      label: 'Still flying',
      className: 'text-destructive',
      borderClassName: 'border-destructive',
    },
  }

/**
 * Whether this Drone has landed for end-of-lesson checks.
 *
 * Read from the airframe's airborne flag in vitals — not from Status alone, so a Fault
 * on the ground still reads as Landed and a Flying Drone still in the air reads as Still flying.
 */
export function isLanded(vitals: DroneVitals): boolean {
  return !vitals.airborne
}

export function landedBoardLabel(vitals: DroneVitals): LandedBoardLabel {
  return isLanded(vitals) ? 'Landed' : 'Still flying'
}

export function landedWallSummary(vitals: readonly DroneVitals[]): {
  readonly landed: number
  readonly stillFlying: number
} {
  let landed = 0
  let stillFlying = 0
  for (const entry of vitals) {
    if (isLanded(entry)) landed += 1
    else stillFlying += 1
  }
  return { landed, stillFlying }
}
