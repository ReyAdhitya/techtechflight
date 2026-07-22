'use client'

import { useFleet } from './FleetProvider'

/**
 * Making the world misbehave, so a demonstration does not have to wait for it.
 *
 * This panel exists here, in Settings, and nowhere near a flight strip. Requirement C9 is
 * a rule about restraint and rules about restraint erode, so it is worth writing down
 * plainly why: asking a Drone to land is a request to an aircraft, and one day it can be a
 * real one. Inventing a fault is the world pretending, and never can be. Putting them side
 * by side would teach a Teacher an interaction that cannot exist on hardware — which would
 * make the demonstration a lie about the product rather than a preview of it.
 *
 * Absent entirely when the Fleet is real. There is nothing honest for it to do there.
 */
export function ScenarioPanel() {
  const { scenarios, snapshot } = useFleet()
  const drones = snapshot.state?.drones ?? []

  if (!scenarios || drones.length === 0) return null

  const triggers: readonly { label: string; run: (droneId: string) => void }[] = [
    { label: 'Fault', run: (id) => scenarios.injectFault(id) },
    { label: 'Clear the fault', run: (id) => scenarios.clearFault(id) },
    { label: 'Take off', run: (id) => scenarios.takeOff(id) },
    { label: 'Drop the link', run: (id) => scenarios.loseLink(id) },
    { label: 'Restore the link', run: (id) => scenarios.restoreLink(id) },
    { label: 'Flatten the battery', run: (id) => scenarios.setBattery(id, 0.08) },
    { label: 'Put it on charge', run: (id) => scenarios.plugIn(id) },
  ]

  return (
    <section className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">Demonstration</h2>
        <p className="m-0 text-value text-ink-subtle">
          These make the simulated Fleet misbehave, so a fault or a lost link can be shown
          without waiting for one. They are not Commands — nothing here asks a Drone to do
          something, and none of it could work on a real aircraft.
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {drones.map((drone) => (
          <li key={drone.id} className="flex flex-wrap items-center gap-2">
            <span className="w-24 font-display text-value font-medium text-ink">{drone.name}</span>
            {triggers.map((trigger) => (
              <button
                key={trigger.label}
                type="button"
                onClick={() => trigger.run(drone.id)}
                className="min-h-11 cursor-pointer rounded-pill border border-dashed border-hairline bg-transparent px-3 py-1 text-value text-ink-muted hover:border-ink hover:text-ink"
              >
                {trigger.label}
              </button>
            ))}
          </li>
        ))}
      </ul>
    </section>
  )
}
