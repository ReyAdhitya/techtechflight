import type { AlertKind } from './vitals.ts'

/**
 * What to do about each thing that can go wrong.
 *
 * This is the customer's emergency table as data, and it is the mechanism behind the
 * requirement that a Teacher never has to ask anyone how the console works. `CONTEXT.md`
 * already says every Alert must say what to *do* rather than what is true; this extends
 * that from a sentence to a set of pressable choices, and gives the Teacher the rest of
 * the picture — what the aircraft is already doing about it, and what "resolved" looks
 * like — so they are not guessing at any point.
 *
 * The customer's five safety priorities order everything here. When two Alerts arrive
 * together the console recommends by people, then airspace rules, then recovering the
 * aircraft, then finishing the Mission, then logging it. That ordering is a judgement
 * about what matters, and it belongs in one place rather than in each screen.
 */

/** The five, in order. Lower is more urgent. */
export type SafetyPriority =
  | 'people'
  | 'airspace'
  | 'recovery'
  | 'mission'
  | 'logging'

export const SAFETY_PRIORITY_ORDER: readonly SafetyPriority[] = [
  'people',
  'airspace',
  'recovery',
  'mission',
  'logging',
]

export const PRIORITY_WORDS: Readonly<Record<SafetyPriority, string>> = {
  people: 'People safety',
  airspace: 'Airspace rules',
  recovery: 'Recovering the aircraft',
  mission: 'Finishing the Mission',
  logging: 'Recording what happened',
}

/**
 * One thing the Teacher can do about an incident.
 *
 * `command` marks the ones that are Commands and therefore reach the simulated Fleet only
 * (ADR-0011). The rest are Clearances, Instructions or things done in the room, and they
 * work on real hardware — which is most of them, and is the point of ADR-0021.
 */
export interface PlaybookResponse {
  readonly label: string
  readonly detail: string
  readonly command: 'land' | 'hold' | 'return-home' | 'emergency-stop' | null
}

export interface PlaybookEntry {
  readonly kind: AlertKind
  /** What a Teacher calls this when they say it out loud. */
  readonly title: string
  readonly priority: SafetyPriority
  /** What the aircraft is already doing, so the Teacher is not duplicating it. */
  readonly craftDoes: string
  /** What the board has already done about it. */
  readonly systemDoes: string
  /** Ordered. The first is the one the console recommends. */
  readonly responses: readonly PlaybookResponse[]
  /** What the team should be doing meanwhile. Printed on their brief. */
  readonly teamDoes: string
  /** How a Teacher knows it is over. */
  readonly resolvedWhen: string
}

const RECALL: PlaybookResponse = {
  label: 'Recall',
  detail: 'Bring it back to where it took off and land there.',
  command: 'return-home',
}

const HOLD: PlaybookResponse = {
  label: 'Hold position',
  detail: 'Stop it going anywhere while you decide.',
  command: 'hold',
}

const LAND_NOW: PlaybookResponse = {
  label: 'Land now',
  detail: 'Put it down where it is. Use this when where it is beats where it came from.',
  command: 'land',
}

const STOP: PlaybookResponse = {
  label: 'Stop',
  detail: 'Cut the motors. Only when something is about to be hurt.',
  command: 'emergency-stop',
}

const TELL_THE_TEAM = (what: string): PlaybookResponse => ({
  label: 'Instruct the team',
  detail: what,
  command: null,
})

/**
 * The playbook.
 *
 * Every `AlertKind` appears, and a test enforces that — an Alert with no entry would reach
 * a Teacher as a condition with no advice, which is the exact failure this table exists to
 * prevent.
 */
const ENTRIES: readonly PlaybookEntry[] = [
  {
    kind: 'emergency-stop',
    title: 'Emergency stop is latched',
    priority: 'people',
    craftDoes: 'Motors are cut. It is not flying and will not fly.',
    systemDoes: 'Holds the Status at Fault and records the stop against this Lesson.',
    responses: [
      TELL_THE_TEAM('Keep everyone back until you have reached the aircraft yourself.'),
      {
        label: 'Release the stop',
        detail: 'Only once you are standing at the aircraft and the area is clear.',
        command: null,
      },
    ],
    teamDoes: 'Stand back. Do not approach or pick it up.',
    resolvedWhen: 'You have reached the aircraft, checked it, and released the stop.',
  },
  {
    kind: 'crash',
    title: 'Possible hard landing',
    priority: 'people',
    // Nothing on a real link reports a crash. This is inferred, and says so everywhere.
    craftDoes: 'Nothing that can be relied on. Treat it as unpowered until you have looked.',
    systemDoes: 'Records the last position and the readings around it.',
    responses: [
      TELL_THE_TEAM('Nobody approaches until you say so. Send them to the wall.'),
      STOP,
    ],
    teamDoes: 'Stay where you are. Do not go and get it.',
    resolvedWhen: 'You have secured the area and looked at the aircraft yourself.',
  },
  {
    kind: 'separation',
    title: 'Two Drones are too close',
    priority: 'people',
    craftDoes: 'Nothing. Neither aircraft can see the other.',
    systemDoes: 'Draws the pair joined on the Scope and ranks this first in Attention.',
    responses: [
      HOLD,
      TELL_THE_TEAM('One team climbs, the other descends. Name which is which out loud.'),
      LAND_NOW,
    ],
    teamDoes: 'Separate as instructed. Do not both move the same way.',
    resolvedWhen: 'The two are back outside the separation distance.',
  },
  {
    kind: 'no-fly',
    title: 'Out of bounds',
    priority: 'airspace',
    craftDoes: 'Nothing. The boundary is drawn on the board, not fenced in the room.',
    systemDoes: 'Records the breach and counts it against the Mission score.',
    responses: [
      TELL_THE_TEAM('Turn back the way you came in. Do not cut across.'),
      HOLD,
      RECALL,
    ],
    teamDoes: 'Stop, turn, and leave by the way you entered.',
    resolvedWhen: 'The Drone is back inside the Mission Zone and outside every No-fly Zone.',
  },
  {
    kind: 'fault',
    title: 'A Drone has reported a fault',
    priority: 'recovery',
    craftDoes: 'Depends on the fault. Assume it is still flying and may not respond well.',
    systemDoes: 'Sets the Status to Fault and keeps it out of the usable count.',
    responses: [RECALL, LAND_NOW],
    teamDoes: 'Bring it down gently and hand it to the Teacher.',
    resolvedWhen: 'It is on the ground and withdrawn from service.',
  },
  {
    kind: 'low-endurance',
    title: 'Not enough charge to keep flying',
    priority: 'recovery',
    craftDoes: 'Nothing yet. It will keep flying until it cannot.',
    systemDoes: 'Counts down the endurance it can still measure.',
    responses: [RECALL, LAND_NOW],
    teamDoes: 'Head back now rather than finishing the leg.',
    resolvedWhen: 'It is on the ground, and on charge.',
  },
  {
    kind: 'battery-low',
    title: 'Too little charge to hand out',
    priority: 'mission',
    craftDoes: 'Nothing. It is on the bench.',
    systemDoes: 'Keeps it out of the serviceable count and forecasts its return if it can.',
    responses: [
      { label: 'Place on charge', detail: 'And nominate a spare for this team.', command: null },
    ],
    teamDoes: 'Take the spare and carry on.',
    resolvedWhen: 'It is charged enough to be serviceable again.',
  },
  {
    kind: 'obstacle',
    title: 'Something is close to a Drone',
    priority: 'recovery',
    craftDoes: 'Nothing automatic. The rangefinder sees it; the aircraft does not avoid it.',
    systemDoes: 'Reports the distance and the bearing while it can see it.',
    responses: [HOLD, TELL_THE_TEAM('Back off the way you came, slowly.')],
    teamDoes: 'Stop moving toward it and reverse out.',
    resolvedWhen: 'There is clear air around it again.',
  },
  {
    kind: 'no-response',
    title: 'A Drone has stopped responding',
    priority: 'recovery',
    craftDoes: 'Unknown, and it must be treated as unknown rather than assumed landed.',
    systemDoes: 'Holds the last reading with its age and keeps trying to reconnect.',
    responses: [
      TELL_THE_TEAM('Watch it with your eyes and tell me what it is actually doing.'),
      { label: 'Note the last position', detail: 'It is on the Scope, greyed and aged.', command: null },
    ],
    teamDoes: 'Keep it in sight. Do not chase it.',
    resolvedWhen: 'It is answering again, or it is in your hands.',
  },
  {
    kind: 'missed-checkpoint',
    title: 'A checkpoint was passed without being reached',
    priority: 'mission',
    craftDoes: 'Nothing. It has flown on.',
    systemDoes: 'Records the miss and leaves the checkpoint outstanding.',
    responses: [
      TELL_THE_TEAM('Go back for it, or skip it and carry on. Tell them which.'),
      { label: 'Skip the checkpoint', detail: 'It stops counting against the score.', command: null },
    ],
    teamDoes: 'Turn back for it, or carry on, as instructed.',
    resolvedWhen: 'The checkpoint is reached, or you have skipped it deliberately.',
  },
  {
    kind: 'mission-timeout',
    title: 'The Mission has run out of time',
    priority: 'mission',
    craftDoes: 'Nothing. The clock is a teaching device, not a failsafe.',
    systemDoes: 'Marks the Mission as out of time and stops the clock.',
    responses: [
      RECALL,
      { label: 'Give more time', detail: 'Extend the limit and say so to the room.', command: null },
    ],
    teamDoes: 'Bring it home and be ready to say how far you got.',
    resolvedWhen: 'Every Drone is down and you have confirmed the Mission complete.',
  },
  {
    kind: 'uneven-motors',
    title: 'One motor is working much harder than the others',
    priority: 'logging',
    craftDoes: 'Compensating, for now.',
    systemDoes: 'Shows the four thrusts so the odd one out is visible.',
    responses: [
      RECALL,
      { label: 'Withdraw it after this Mission', detail: 'And note why in the Logbook.', command: null },
    ],
    teamDoes: 'Fly gently and land when told.',
    resolvedWhen: 'It is on the ground and someone has looked at the airframe.',
  },
]

const BY_KIND = new Map<AlertKind, PlaybookEntry>(ENTRIES.map((entry) => [entry.kind, entry]))

export function playbookFor(kind: AlertKind): PlaybookEntry | null {
  return BY_KIND.get(kind) ?? null
}

export const PLAYBOOK: readonly PlaybookEntry[] = ENTRIES

/**
 * Rank incidents the way the Teacher should deal with them.
 *
 * By safety priority first, and only then by anything else. Deliberately **not** by Alert
 * severity: a `critical` low charge and a `warning` no-fly breach are not in the order
 * their severities suggest, because one of them is about where an aircraft is relative to
 * a room full of children.
 *
 * Stable — equal priorities keep the order they arrived in, so the list does not reshuffle
 * under a Teacher mid-glance (the same reasoning as DELIBERATE-POSITIONS 1).
 */
export function byUrgency<T>(items: readonly T[], kindOf: (item: T) => AlertKind): readonly T[] {
  const rank = (item: T) => {
    const entry = playbookFor(kindOf(item))
    if (!entry) return SAFETY_PRIORITY_ORDER.length
    return SAFETY_PRIORITY_ORDER.indexOf(entry.priority)
  }

  return [...items]
    .map((item, index) => ({ item, index, rank: rank(item) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item)
}
