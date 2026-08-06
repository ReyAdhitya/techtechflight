'use client'

import { MISSION_SCENARIOS } from '@/lib/mission-scenarios'
import type { ScenarioId } from '@/lib/mission'
import { cn } from '@/lib/utils'

/**
 * Pick the Mission Scenario a Lesson runs — one of the three that ship.
 *
 * Integrator mounts on Mission Planner / Lesson prep. The choice is changeable until the
 * first Clearance is granted (`locked`). Cards show objective, success criteria and common
 * risks so a Teacher can compare before committing.
 */
export function ScenarioPicker({
  selectedScenarioId,
  onSelect,
  locked,
  bare = false,
}: {
  readonly selectedScenarioId: ScenarioId | null
  readonly onSelect: (id: ScenarioId) => void
  readonly locked: boolean
  /**
   * Drop the heading, the standfirst and the card around them.
   *
   * On a Mission step the step already says what this is and why, and repeating it inside
   * a second card is the duplicate chrome the step layout exists to remove.
   */
  readonly bare?: boolean
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-4',
        !bare && 'rounded-surface border border-hairline bg-surface-1 p-5',
      )}
      aria-label={bare ? 'Mission Scenario' : undefined}
      aria-labelledby={bare ? undefined : 'scenario-picker-heading'}
    >
      {bare ? null : (
        <div className="flex flex-col gap-1">
          <h2 id="scenario-picker-heading" className="label m-0">
            Mission Scenario
          </h2>
          <p className="m-0 text-value text-ink-subtle">
            A Lesson runs one Scenario at a time. Pick what the class is trying to achieve:
            the flow, exercises and brief follow from here.
          </p>
        </div>
      )}

      {selectedScenarioId === null ? (
        <p className="m-0 text-value text-ink-muted">
          No Scenario chosen yet. Pick one below. You can change it until the first
          Clearance is granted.
        </p>
      ) : locked ? (
        <p className="m-0 text-value text-ink-muted">
          Scenario set for this Lesson. The first Clearance has been granted, so it cannot be
          changed.
        </p>
      ) : (
        <p className="m-0 text-value text-ink-subtle">
          {MISSION_SCENARIOS.find((scenario) => scenario.id === selectedScenarioId)?.name ??
            'Scenario chosen'}
          {', '}
          you can still change it until the first Clearance is granted.
        </p>
      )}

      <ul
        className="m-0 grid list-none grid-cols-1 gap-3 p-0 min-[40rem]:grid-cols-3"
        role="group"
        aria-label="Mission Scenarios"
      >
        {MISSION_SCENARIOS.map((scenario) => {
          const selected = scenario.id === selectedScenarioId
          return (
            <li key={scenario.id}>
              <button
                type="button"
                disabled={locked}
                aria-pressed={selected}
                onClick={() => onSelect(scenario.id)}
                className={cn(
                  'flex h-full min-h-11 w-full cursor-pointer flex-col gap-3 rounded-sm border bg-canvas p-4 text-left',
                  'hover:border-ink-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                  /*
                   * The chosen Scenario is the one decision the whole set-up hangs off, and
                   * it is read at a glance on the way back to step 1. An ink border alone
                   * was one hairline different from the other two cards.
                   */
                  selected ? 'border-brand bg-brand-wash ring-1 ring-brand' : 'border-hairline',
                  locked && 'cursor-not-allowed opacity-80',
                )}
              >
                <span className="font-display text-value font-medium text-ink">
                  {scenario.name}
                </span>

                <div className="flex flex-col gap-1">
                  <span className="label">Objective</span>
                  <p className="m-0 text-value text-ink-subtle">{scenario.objective}</p>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="label">Success criteria</span>
                  <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                    {scenario.successCriteria.map((criterion) => (
                      <li key={criterion} className="text-value text-ink-subtle">
                        {criterion}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="label">Common risks</span>
                  <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                    {scenario.commonRisks.map((risk) => (
                      <li key={risk} className="text-value text-ink-muted">
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
