import type { ScenarioControls } from './fleet-link'

/**
 * Named AED-style training scenarios for the simulated Fleet.
 *
 * Runners live in Settings only (C9). Each `run` makes the world misbehave; `reset` parks
 * the classroom via `resetClassroom`. See `docs/training-scenarios.md`.
 */

const D1 = 'ttf-0001'
const D2 = 'ttf-0002'
const D3 = 'ttf-0003'
const ALL = [D1, D2, D3, 'ttf-0004', 'ttf-0005', 'ttf-0006'] as const

export interface TrainingScenario {
  readonly id: string
  readonly name: string
  /** What the Teacher should look at after Run. */
  readonly hits: string
  readonly run: (scenarios: ScenarioControls) => void
}

export const TRAINING_SCENARIOS: readonly TrainingScenario[] = [
  {
    id: 'T1',
    name: 'Separation conflict',
    hits: 'Attention NOW, strip alerts, Scope solid conflict (top-down)',
    run: (s) => {
      s.takeOff(D1)
      s.takeOff(D2)
      s.setAltitude(D1, 1.5)
      s.setAltitude(D2, 1.5)
      s.placeNear(D2, D1, 0.8)
    },
  },
  {
    id: 'T2',
    name: 'Low charge while flying',
    hits: 'Strip charge/endurance, Land-now alert, Fleet attention',
    run: (s) => {
      s.takeOff(D1)
      s.setAltitude(D1, 1.5)
      s.setBattery(D1, 0.08)
    },
  },
  {
    id: 'T3',
    name: 'Lost link then restore',
    hits: 'Fleet Offline, Control age honesty, Restore clears',
    run: (s) => {
      s.loseLink(D2)
    },
  },
  {
    id: 'T4',
    name: 'Fault / withdraw',
    hits: 'Status Fault, Needs Attention, boardOrder unchanged',
    run: (s) => {
      s.injectFault(D3)
    },
  },
  {
    id: 'T5',
    name: 'Emergency stop',
    hits: 'Emergency alert, Stop / Release path on sim',
    run: (s) => {
      s.takeOff(D1)
      s.setAltitude(D1, 1.5)
      s.triggerEmergencyStop(D1)
    },
  },
  {
    id: 'T6',
    name: 'Link group',
    hits: 'Scope dashed ties (top-down)',
    run: (s) => {
      s.takeOff(D1)
      s.takeOff(D2)
      s.takeOff(D3)
      s.setAltitude(D1, 1.2)
      s.setAltitude(D2, 1.2)
      s.setAltitude(D3, 1.2)
      s.link(ALL)
    },
  },
  {
    id: 'T7',
    name: 'Height / Side view',
    hits: 'Strip Z, toggle Side, marks separate vertically (and on north)',
    run: (s) => {
      s.takeOff(D1)
      s.takeOff(D2)
      s.setAltitude(D1, 0.5)
      s.setAltitude(D2, 2.5)
      // Side horizontal is north — separate them on that axis.
      s.setPosition(D1, 1, 0)
      s.setPosition(D2, 1, 3)
    },
  },
  {
    id: 'T7b',
    name: 'Front view',
    hits: 'Toggle Front, classroom row spreads on east',
    run: (s) => {
      s.takeOff(D1)
      s.takeOff(D2)
      s.setAltitude(D1, 1.5)
      s.setAltitude(D2, 1.5)
      // Front horizontal is east — different east, same north.
      s.setPosition(D1, 0, 0)
      s.setPosition(D2, 3, 0)
    },
  },
  {
    id: 'T8',
    name: 'Commands react to state',
    hits: 'Land/Hold enabled airborne; grounded disabled; Stop path',
    run: (s) => {
      s.takeOff(D1)
      s.setAltitude(D1, 1.5)
    },
  },
  {
    id: 'T11',
    name: 'Drone detail under Fault',
    hits: 'Open /drone?id=ttf-0001, instruments + service',
    run: (s) => {
      s.injectFault(D1)
    },
  },
  {
    id: 'T12',
    name: 'Stale / lost link honesty',
    hits: 'Age wording, not presented as current',
    run: (s) => {
      s.loseLink(D1)
    },
  },
]

/** Boss demo order — AED full exam path. */
export const FULL_DRILL_ORDER = ['T9', 'T1', 'T2', 'T5', 'T10'] as const

export function resetTraining(scenarios: ScenarioControls): void {
  scenarios.resetClassroom()
}
