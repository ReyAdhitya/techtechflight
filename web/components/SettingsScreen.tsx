'use client'

import { useFleet } from './FleetProvider'
import { ClassroomSetupPanel } from './ClassroomSetupPanel'
import { ScenarioPanel } from './ScenarioPanel'
import { SeparationThresholdPanel } from './SeparationThresholdPanel'
import { TrainerDronesPanel } from './TrainerDronesPanel'
import { TrainingScenariosPanel } from './TrainingScenariosPanel'
import { cn } from '@/lib/utils'
import { READING_FRAME } from '@/lib/frame'

/**
 * The things a Teacher can change, and what the ground station is doing.
 *
 * Thresholds are read-only here on purpose. What counts as a usable charge, and how long
 * silence lasts before Telemetry stops being trusted, are the ground station's decisions
 * — they are properties of the room and the radio, and a second copy of them in the
 * browser would drift the moment either changed.
 *
 * There is no records panel any more, and so no Export, Import or Clear everything. Notes,
 * service decisions and lesson records still live in this one browser profile; what has gone
 * is every route to moving or clearing them. That was decided with its consequences stated —
 * see `docs/CHANGELOG.md`.
 */
export function SettingsScreen() {
  const { snapshot, demo } = useFleet()

  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(READING_FRAME, 'flex flex-col gap-8 p-4 min-[26rem]:p-8')}
    >
      <h1 className="m-0 font-display text-summary font-medium">Settings</h1>


      <ClassroomSetupPanel />

      <SeparationThresholdPanel />

      <Panel title="The ground station">
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="label self-center">Connection</dt>
          <dd className="m-0 text-value">
            {demo
              ? 'Offline Fleet. No ground station is being contacted.'
              : snapshot.connection === 'live'
                ? 'Connected'
                : snapshot.connection === 'connecting'
                  ? 'Connecting'
                  : 'Cannot be reached. Retrying.'}
          </dd>
          <dt className="label self-center">Drones registered</dt>
          <dd className="tnum m-0 text-value">{snapshot.state?.drones.length ?? 0}</dd>
          <dt className="label self-center">History kept</dt>
          <dd className="tnum m-0 text-value">
            {snapshot.history ? `${snapshot.history.events.length} events` : 'None sent'}
          </dd>
        </dl>
        <p className="m-0 text-value text-ink-subtle">
          The board follows whatever host it is served from and looks for a ground station
          on port 4321. Charge and timing thresholds are set on the ground station, not
          here, so both halves can never disagree about them.
        </p>
      </Panel>

      <TrainerDronesPanel />

      <TrainingScenariosPanel />

      <ScenarioPanel />

    </main>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-5">
      <h2 className="label m-0">{title}</h2>
      {children}
    </section>
  )
}
