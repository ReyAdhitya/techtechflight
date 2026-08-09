import type { VitalsAlert } from './vitals.ts'

/**
 * The four situations the Student poster names, and what a child does about each.
 *
 * The app printed the battery percentage and never said what to do with it, which is a
 * reading rather than an answer. The poster's own table is:
 *
 * | Low battery       | Follow ATC; return / land |
 * | Obstacle ahead    | Adjust route              |
 * | New target        | Confirm Understood; continue |
 * | Missed checkpoint | Follow ATC; re-route      |
 *
 * Those are the instructions. The words below are the Student prototype's register rather
 * than the poster's shorthand, because "Follow ATC" is a phrase for an adult in a tower and
 * this is read by a ten year old at a flight line: the *action* is the poster's, the
 * sentence is the prototype's. Recorded in `docs/DECISIONS.md`.
 *
 * Every one of them says what to do, never what is true. A warning takes the whole screen
 * (ADR-0025), so there is room for a sentence and no reason to abbreviate one.
 */

export type WhatIfKind = 'low-battery' | 'obstacle' | 'new-target' | 'missed-checkpoint'

export interface WhatIfAnswer {
  readonly kind: WhatIfKind
  /** The heading, at the size the whole screen gives it. */
  readonly heading: string
  /** What to do, in one sentence. */
  readonly says: string
}

export const WHAT_IF_ANSWERS: Readonly<Record<WhatIfKind, WhatIfAnswer>> = {
  'low-battery': {
    kind: 'low-battery',
    heading: 'Charge is low',
    says: 'Bring it back and land. Your Teacher will swap the battery.',
  },
  obstacle: {
    kind: 'obstacle',
    heading: 'Something is in the way',
    says: 'Stop where you are, then go around it. Do not fly over it.',
  },
  'new-target': {
    kind: 'new-target',
    heading: 'New target',
    says: 'Press Understood, then fly to the new place your Teacher named.',
  },
  'missed-checkpoint': {
    kind: 'missed-checkpoint',
    heading: 'You went past a point',
    says: 'Turn around and fly back to it. Points count in any order.',
  },
}

/**
 * Which of the four a live Alert is, or null when it is none of them.
 *
 * Mapped from the Alert kinds the board already raises, so the Student's answer and the
 * Teacher's Alert are the same event rather than two systems noticing separately.
 */
export function whatIfFor(alert: VitalsAlert): WhatIfAnswer | null {
  switch (alert.kind) {
    case 'battery-low':
    case 'low-endurance':
      return WHAT_IF_ANSWERS['low-battery']
    case 'obstacle':
      return WHAT_IF_ANSWERS.obstacle
    case 'missed-checkpoint':
      return WHAT_IF_ANSWERS['missed-checkpoint']
    default:
      return null
  }
}

/** The worst of the four a Student's Alerts add up to, or null when none of them apply. */
export function worstWhatIf(alerts: readonly VitalsAlert[]): WhatIfAnswer | null {
  for (const alert of alerts) {
    const answer = whatIfFor(alert)
    if (answer !== null) return answer
  }
  return null
}
