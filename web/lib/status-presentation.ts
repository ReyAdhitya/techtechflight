import type { Status } from '@techtechflight/contract'

/**
 * How each Status reads on the board.
 *
 * Colour never carries a Status on its own. Every one of these has a written label and
 * a distinct shape as well, so the board survives a colour-blind Teacher, a washed-out
 * projector, and a photocopier.
 */
export interface StatusPresentation {
  /** The precise Status, shown on the tile. */
  readonly label: string
  /** Shape class — filled, hollow, half, or square. Never colour alone. */
  readonly shape: 'filled' | 'hollow' | 'half' | 'square' | 'ringed'
  /** What a Teacher should do about it, for the detail view. */
  readonly meaning: string
}

export const STATUS_PRESENTATION: Readonly<Record<Status, StatusPresentation>> = {
  Ready: {
    label: 'Ready',
    shape: 'filled',
    meaning: 'Charged, in contact, and safe to hand to a Student.',
  },
  Flying: {
    label: 'Flying',
    shape: 'ringed',
    meaning: 'Airborne right now.',
  },
  'Not Ready': {
    label: 'Not Ready',
    shape: 'half',
    meaning: 'Something is preventing flight — usually charge. Fixable before the lesson.',
  },
  Fault: {
    label: 'Fault',
    shape: 'square',
    meaning: 'Take this one out of service. Not fixable before the lesson.',
  },
  Offline: {
    label: 'Offline',
    shape: 'hollow',
    meaning: 'No recent contact. Normal for a Drone that is switched off.',
  },
}

/**
 * Whether a Teacher can fix this before the lesson starts.
 *
 * The Needs Attention bucket deliberately hides which of the two a Drone is, but once
 * they ask, this is the distinction that decides whether to charge it or set it aside.
 */
export function isFixableBeforeTheLesson(status: Status): boolean {
  return status === 'Not Ready'
}
