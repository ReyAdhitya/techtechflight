'use client'

import { useEffect, useState } from 'react'
import { scenarioOrUnknown } from '@/lib/mission-scenarios'
import type { ScenarioId } from '@/lib/mission'
import { cn } from '@/lib/utils'

/**
 * Mission rules and safety briefing — tickable sections for each Lesson.
 *
 * Fixed rules grouped as mission rules, safety limits, no-fly rules, communication
 * protocol and emergency procedures. Scenario context comes from `mission-scenarios`;
 * ticks follow the same Lesson-scoped localStorage pattern as the classroom safety brief.
 * Word and shape carry done/undone (ADR-0004).
 */

export const MISSION_BRIEFING_KEY = 'techtechflight:mission-briefing'

export const MISSION_BRIEFING_SECTIONS = [
  {
    id: 'mission-rules',
    title: 'Mission rules',
    rules: [
      {
        id: 'one-scenario',
        label: 'This Lesson runs one Scenario — follow its flow in order.',
      },
      {
        id: 'checkpoints-first',
        label: 'Reach required checkpoints before reporting the Mission done.',
      },
      {
        id: 'team-drone',
        label: 'Fly only the craft your team was assigned.',
      },
    ],
  },
  {
    id: 'safety-limits',
    title: 'Safety limits',
    rules: [
      {
        id: 'altitude-floor',
        label: 'Stay above the altitude floor the Teacher set for this room.',
      },
      {
        id: 'separation',
        label: 'Keep separation — call out if another craft is too close.',
      },
      {
        id: 'time-limit',
        label: 'Respect the Mission time limit; land before the clock runs out.',
      },
      {
        id: 'charge',
        label: 'Land when charge is low — do not fly until the pack is swapped.',
      },
    ],
  },
  {
    id: 'no-fly-rules',
    title: 'No-fly rules',
    rules: [
      {
        id: 'hatched-zones',
        label: 'Never enter a hatched No-fly Zone on the map.',
      },
      {
        id: 'drift-out',
        label: 'If you drift toward a No-fly Zone, hover and call the Teacher.',
      },
      {
        id: 'no-excuse',
        label: 'No-fly means no exceptions without Teacher clearance.',
      },
    ],
  },
  {
    id: 'communication-protocol',
    title: 'Communication protocol',
    rules: [
      {
        id: 'hand-up',
        label: 'Raise your hand and wait — do not shout over motors.',
      },
      {
        id: 'team-call',
        label: 'Call "Team [name], request Land / Hover / Help" so the room can hear you.',
      },
      {
        id: 'teacher-wins',
        label: 'Teacher instructions override the team plan.',
      },
      {
        id: 'report-checkpoints',
        label: 'Report each checkpoint reached before moving to the next.',
      },
    ],
  },
  {
    id: 'emergency-procedures',
    title: 'Emergency procedures',
    rules: [
      {
        id: 'stop-now',
        label: 'Stop means hands off the sticks immediately.',
      },
      {
        id: 'land-unsure',
        label: 'If unsure, Land in place and call the Teacher.',
      },
      {
        id: 'teacher-stop',
        label: 'If the craft is out of control, the Teacher will press Stop from the board.',
      },
      {
        id: 'wait-release',
        label: 'After an emergency stop, do not take off until the Teacher releases it.',
      },
    ],
  },
] as const

type MissionBriefingRule = (typeof MISSION_BRIEFING_SECTIONS)[number]['rules'][number]

export type MissionBriefingRuleId = MissionBriefingRule['id']

export type MissionBriefingState = {
  readonly lessonId: string | null
  readonly checked: Readonly<Partial<Record<MissionBriefingRuleId, boolean>>>
}

export const MISSION_BRIEFING_RULES: readonly MissionBriefingRule[] =
  MISSION_BRIEFING_SECTIONS.flatMap((section) => [...section.rules])

function isRuleId(value: string): value is MissionBriefingRuleId {
  return MISSION_BRIEFING_RULES.some((rule) => rule.id === value)
}

export function emptyMissionBriefing(lessonId: string | null): MissionBriefingState {
  return { lessonId, checked: {} }
}

export function readMissionBriefing(lessonId: string | null): MissionBriefingState {
  if (typeof window === 'undefined') return emptyMissionBriefing(lessonId)
  try {
    const raw = window.localStorage.getItem(MISSION_BRIEFING_KEY)
    if (!raw) return emptyMissionBriefing(lessonId)
    const parsed = JSON.parse(raw) as {
      lessonId?: string | null
      checked?: Record<string, boolean>
    }
    if (parsed.lessonId !== lessonId) return emptyMissionBriefing(lessonId)
    const checked: Partial<Record<MissionBriefingRuleId, boolean>> = {}
    for (const [id, value] of Object.entries(parsed.checked ?? {})) {
      if (isRuleId(id) && value === true) checked[id] = true
    }
    return { lessonId, checked }
  } catch {
    return emptyMissionBriefing(lessonId)
  }
}

function writeMissionBriefing(state: MissionBriefingState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MISSION_BRIEFING_KEY, JSON.stringify(state))
}

export function toggleMissionBriefRule(
  lessonId: string | null,
  ruleId: MissionBriefingRuleId,
): MissionBriefingState {
  const current = readMissionBriefing(lessonId)
  const nextChecked = { ...current.checked }
  if (nextChecked[ruleId]) delete nextChecked[ruleId]
  else nextChecked[ruleId] = true
  const next: MissionBriefingState = { lessonId, checked: nextChecked }
  writeMissionBriefing(next)
  return next
}

export function resetMissionBriefing(lessonId: string | null): MissionBriefingState {
  const next = emptyMissionBriefing(lessonId)
  writeMissionBriefing(next)
  return next
}

export function missionBriefingDoneCount(state: MissionBriefingState): number {
  return MISSION_BRIEFING_RULES.filter((rule) => state.checked[rule.id] === true).length
}

export function isMissionBriefingComplete(state: MissionBriefingState): boolean {
  return missionBriefingDoneCount(state) === MISSION_BRIEFING_RULES.length
}

export function MissionBriefing({
  lessonId,
  scenarioId = null,
}: {
  /** Running Lesson id, or null when none is under way. */
  readonly lessonId: string | null
  /** Scenario this Lesson runs — shows objective and risks above the checklist. */
  readonly scenarioId?: ScenarioId | null
}) {
  const [state, setState] = useState<MissionBriefingState>(() =>
    readMissionBriefing(lessonId),
  )

  useEffect(() => {
    setState(readMissionBriefing(lessonId))
  }, [lessonId])

  const scenario = scenarioId ? scenarioOrUnknown(scenarioId) : null
  const done = missionBriefingDoneCount(state)
  const total = MISSION_BRIEFING_RULES.length

  return (
    <section
      className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5"
      aria-labelledby="mission-briefing-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex flex-col gap-1">
          <h2 id="mission-briefing-heading" className="label m-0">
            Mission rules and safety briefing
          </h2>
          <p className="m-0 text-value text-ink-subtle">
            Walk the class through these before takeoff. Ticks clear when a new Lesson starts.
          </p>
        </div>
        <p className="m-0 text-value text-ink-subtle" role="status">
          <span className="tnum">{done}</span>
          {' of '}
          <span className="tnum">{total}</span>
          {' done'}
        </p>
      </div>

      {scenario ? (
        <div className="flex flex-col gap-2 rounded-sm border border-hairline bg-canvas p-3">
          <p className="m-0 font-display text-value font-medium text-ink">{scenario.name}</p>
          <p className="m-0 text-value text-ink-subtle">{scenario.objective}</p>
          {scenario.commonRisks.length > 0 ? (
            <div className="flex flex-col gap-1">
              <span className="label">Watch for</span>
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {scenario.commonRisks.map((risk) => (
                  <li key={risk} className="text-value text-ink-muted">
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="m-0 text-value text-ink-muted">
          Pick a Mission Scenario to show its objective here.
        </p>
      )}

      {!lessonId ? (
        <p className="m-0 text-value text-ink-muted">
          Start a Lesson to keep ticks for this period. You can still walk the brief now —
          marks will not be kept until a Lesson is running.
        </p>
      ) : null}

      {MISSION_BRIEFING_SECTIONS.map((section) => (
        <div key={section.id} className="flex flex-col gap-2">
          <h3 className="label m-0">{section.title}</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {section.rules.map((rule) => {
              const checked = state.checked[rule.id] === true
              return (
                <li key={rule.id}>
                  <button
                    type="button"
                    onClick={() => setState(toggleMissionBriefRule(lessonId, rule.id))}
                    aria-pressed={checked}
                    className={cn(
                      'flex w-full min-h-11 cursor-pointer items-start gap-3 rounded-sm border border-hairline bg-canvas px-3 py-2 text-left text-ink',
                      'hover:border-ink-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-sm border text-caption',
                        checked
                          ? 'border-ink bg-ink text-canvas'
                          : 'border-hairline bg-transparent text-transparent',
                      )}
                      aria-hidden="true"
                    >
                      {checked ? '✓' : '·'}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-display text-value font-medium text-ink">
                        {rule.label}
                      </span>
                      <span className="text-caption text-ink-muted">
                        {checked ? 'Done' : 'Still open'}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {done > 0 ? (
        <button
          type="button"
          onClick={() => setState(resetMissionBriefing(lessonId))}
          className="min-h-11 w-fit cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
        >
          Clear ticks
        </button>
      ) : null}
    </section>
  )
}
