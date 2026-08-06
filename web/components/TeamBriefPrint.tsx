'use client'

import type { LocalPosition } from '@techtechflight/contract'
import { enclosesAnything, type Zone } from '@/lib/airspace'
import type { Mission, MissionCheckpoint } from '@/lib/mission'
import { scenarioOrUnknown } from '@/lib/mission-scenarios'
import type { Team } from '@/lib/teams'

/**
 * One A4 printable team brief (#540 / F376).
 *
 * Carries objective, map, checkpoints, time limit and four what-if responses for one
 * team. Relies on the board's global `@media print` paper-token reset (see globals.css —
 * "Printing a Lesson report.") and adds scoped rules so each sheet stays on one page.
 * Meaning is never carried by colour alone — zones and checkpoints are labelled and
 * hatched or numbered (ADR-0004).
 */

export const TEAM_BRIEF_PRINT_CSS = `
@media print {
  .team-brief-print {
    break-inside: avoid;
    page-break-inside: avoid;
    color: #1b1815;
    background: #ffffff;
  }

  .team-brief-print,
  .team-brief-print * {
    color-scheme: light;
  }

  .team-brief-print .team-brief-map polygon[data-zone-kind='no-fly'] {
    fill: url(#team-brief-hatch);
    stroke: #1b1815;
    stroke-dasharray: 4 3;
  }

  .team-brief-print .team-brief-map polygon[data-zone-kind='mission'] {
    fill: none;
    stroke: #1b1815;
  }
}
`.trim()

/** Four classroom what-if responses — fixed on every team sheet. */
export const TEAM_BRIEF_WHAT_IF = [
  {
    id: 'low-charge',
    question: 'What if charge runs low?',
    answer: 'Land immediately and hand the craft to the Teacher for a swap.',
  },
  {
    id: 'lost-link',
    question: 'What if control link is lost?',
    answer: 'Hold position. The Teacher can Land from the board.',
  },
  {
    id: 'no-fly',
    question: 'What if we enter a No-fly Zone?',
    answer: 'Hover, reverse out, and call the Teacher before continuing.',
  },
  {
    id: 'miss-time',
    question: 'What if we cannot reach a checkpoint in time?',
    answer: 'Report to the Teacher before the Mission clock runs out.',
  },
] as const

const MAP_SIZE_M = 20

function svgY(northM: number): number {
  return MAP_SIZE_M - northM
}

function pointsToPolygon(points: readonly LocalPosition[]): string {
  return points.map((point) => `${point.eastM},${svgY(point.northM)}`).join(' ')
}

function formatLimitMinutes(minutes: number | null, fallback: number): string {
  const value = minutes ?? fallback
  if (value <= 0) return 'No time limit set'
  return `${value} minute${value === 1 ? '' : 's'}`
}

function BriefMap({
  zones,
  checkpoints,
}: {
  readonly zones: readonly Zone[]
  readonly checkpoints: readonly MissionCheckpoint[]
}) {
  const hasGeometry =
    zones.some((zone) => zone.points.length > 0) || checkpoints.length > 0

  if (!hasGeometry) {
    return (
      <p className="m-0 text-value text-ink-muted">
        No Mission area drawn yet. Ask the Teacher for the map before takeoff.
      </p>
    )
  }

  return (
    <figure className="team-brief-map m-0 flex flex-col gap-1">
      <svg
        viewBox={`0 0 ${MAP_SIZE_M} ${MAP_SIZE_M}`}
        role="img"
        aria-label="Mission area map"
        className="h-auto w-full max-h-48 border border-hairline bg-canvas"
      >
        <defs>
          <pattern
            id="team-brief-hatch"
            width="0.8"
            height="0.8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="0.8" stroke="#1b1815" strokeWidth="0.12" />
          </pattern>
        </defs>

        {Array.from({ length: MAP_SIZE_M + 1 }, (_, index) => (
          <g key={`grid-${index}`} aria-hidden="true">
            <line
              x1={index}
              y1={0}
              x2={index}
              y2={MAP_SIZE_M}
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeWidth={0.05}
            />
            <line
              x1={0}
              y1={index}
              x2={MAP_SIZE_M}
              y2={index}
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeWidth={0.05}
            />
          </g>
        ))}

        {zones.map((zone) => {
          if (zone.points.length === 0) return null
          if (!enclosesAnything(zone)) return null
          return (
            <polygon
              key={zone.id}
              points={pointsToPolygon(zone.points)}
              data-zone-kind={zone.kind}
              className={
                zone.kind === 'mission'
                  ? 'fill-transparent stroke-ink'
                  : 'fill-ink/10 stroke-ink'
              }
              strokeWidth={0.15}
              strokeDasharray={zone.kind === 'no-fly' ? '0.4 0.3' : undefined}
            />
          )
        })}

        {checkpoints.map((checkpoint, index) => (
          <g key={checkpoint.id}>
            <circle
              cx={checkpoint.at.eastM}
              cy={svgY(checkpoint.at.northM)}
              r={0.35}
              className="fill-canvas stroke-ink"
              strokeWidth={0.12}
            />
            <text
              x={checkpoint.at.eastM}
              y={svgY(checkpoint.at.northM)}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-ink text-[0.35rem] font-medium"
            >
              {index + 1}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-muted">
        <span>Mission Zone · solid outline</span>
        <span>No-fly Zone · hatched / dashed</span>
        <span>Checkpoints · numbered circles</span>
      </figcaption>
    </figure>
  )
}

export function TeamBriefPrint({
  team,
  mission,
}: {
  readonly team: Team
  readonly mission: Mission
}) {
  const scenario = scenarioOrUnknown(mission.scenarioId)
  const limitLabel = formatLimitMinutes(mission.limitMinutes, scenario.defaultLimitMinutes)
  const droneLabel = team.droneId ?? 'No craft assigned yet'

  return (
    <article
      className="team-brief-print flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-4 text-ink"
      aria-label={`Team brief: ${team.name}`}
    >
      <style>{TEAM_BRIEF_PRINT_CSS}</style>

      <header className="flex flex-col gap-1 border-b border-hairline pb-3">
        <p className="m-0 label">Team brief</p>
        <p className="m-0 font-display text-heading font-medium">{team.name}</p>
        <p className="m-0 text-value text-ink-subtle">
          Craft: <span className="tnum">{droneLabel}</span>
        </p>
        <p className="m-0 text-value text-ink-subtle">
          Mission: {mission.name || scenario.name}
        </p>
      </header>

      <div className="flex flex-col gap-1">
        <span className="label">Objective</span>
        <p className="m-0 text-value text-ink">{scenario.objective}</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="label">Time limit</span>
        <p className="m-0 tnum text-value text-ink">{limitLabel}</p>
      </div>

      <div className="flex flex-col gap-1">
        <span className="label">Map</span>
        <BriefMap zones={mission.zones} checkpoints={mission.checkpoints} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="label">Checkpoints</span>
        {mission.checkpoints.length === 0 ? (
          <p className="m-0 text-value text-ink-muted">No checkpoints on this Mission yet.</p>
        ) : (
          <ol className="m-0 flex list-decimal flex-col gap-1 pl-5">
            {mission.checkpoints.map((checkpoint, index) => (
              <li key={checkpoint.id} className="text-value text-ink">
                <span className="font-medium">{checkpoint.name}</span>
                {!checkpoint.required ? (
                  <span className="text-ink-muted"> (optional)</span>
                ) : null}
                <span className="tnum text-ink-subtle">
                  {' '}
                  · {index + 1} on map
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="label">What if…</span>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {TEAM_BRIEF_WHAT_IF.map((item) => (
            <li
              key={item.id}
              className="rounded-sm border border-hairline bg-canvas px-3 py-2"
            >
              <p className="m-0 font-display text-value font-medium text-ink">
                {item.question}
              </p>
              <p className="m-0 text-value text-ink-subtle">{item.answer}</p>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
