import type { DroneState } from '@techtechflight/contract'
import { cn } from '@/lib/utils'

/**
 * Where the Drones are, looking down on the room.
 *
 * The point is not navigation — nobody flies from this. It answers the question a
 * Teacher actually has when six Drones are up: *which one is that*, and *are two of them
 * about to meet*. Positions are metres from where the Fleet was set up, because a
 * classroom is a room rather than a map and a latitude helps nobody.
 *
 * Drones that have been linked into a group are joined by a line, so a formation reads
 * as one thing rather than as several Drones that happen to be near each other.
 */
export function FormationMap({ drones }: { drones: readonly DroneState[] }) {
  const placed = drones.filter(
    (drone) => drone.telemetry?.position !== undefined && drone.status !== 'Offline',
  )

  if (placed.length === 0) {
    return (
      <p className="m-0 text-value text-ink-subtle">
        No Drone in contact is reporting where it is.
      </p>
    )
  }

  const easts = placed.map((drone) => drone.telemetry!.position!.eastM)
  const norths = placed.map((drone) => drone.telemetry!.position!.northM)
  // A metre of padding, and never a zero-width room when everything is in a line.
  const west = Math.min(...easts) - 1
  const east = Math.max(...easts) + 1
  const south = Math.min(...norths) - 1
  const north = Math.max(...norths) + 1
  const width = Math.max(1, east - west)
  const height = Math.max(1, north - south)

  const x = (eastM: number) => ((eastM - west) / width) * 100
  // North is up, so the axis is flipped: SVG y grows downward.
  const y = (northM: number) => ((north - northM) / height) * 100

  const groups = new Map<string, DroneState[]>()
  for (const drone of placed) {
    const groupId = drone.telemetry?.linkGroupId
    if (!groupId) continue
    groups.set(groupId, [...(groups.get(groupId) ?? []), drone])
  }

  return (
    <figure className="m-0 flex flex-col gap-3">
      <svg
        viewBox="0 0 100 100"
        className="aspect-[4/3] w-full rounded-surface border border-hairline bg-canvas"
        role="img"
        aria-label={`Positions of ${placed.length} Drones in the room`}
      >
        {/* A metre grid, so a distance on screen can be read as a distance in the room. */}
        {gridLines(west, east).map((metre) => (
          <line
            key={`v${metre}`}
            x1={x(metre)}
            x2={x(metre)}
            y1="0"
            y2="100"
            className="stroke-hairline"
            strokeWidth="0.4"
          />
        ))}
        {gridLines(south, north).map((metre) => (
          <line
            key={`h${metre}`}
            x1="0"
            x2="100"
            y1={y(metre)}
            y2={y(metre)}
            className="stroke-hairline"
            strokeWidth="0.4"
          />
        ))}

        {/* Linked Drones first, so the tie sits under the Drones it joins. */}
        {[...groups.values()].map((members) =>
          members.slice(1).map((drone, index) => {
            const from = members[index]!.telemetry!.position!
            const to = drone.telemetry!.position!
            return (
              <line
                key={`${members[index]!.id}-${drone.id}`}
                x1={x(from.eastM)}
                y1={y(from.northM)}
                x2={x(to.eastM)}
                y2={y(to.northM)}
                className="stroke-status-not-ready"
                strokeWidth="0.8"
                strokeDasharray="2 2"
              />
            )
          }),
        )}

        {placed.map((drone) => {
          const position = drone.telemetry!.position!
          const airborne = drone.status === 'Flying'
          return (
            <g key={drone.id} transform={`translate(${x(position.eastM)} ${y(position.northM)})`}>
              <circle
                r={airborne ? 2.6 : 2}
                className={cn(
                  drone.status === 'Fault'
                    ? 'fill-status-fault'
                    : airborne
                      ? 'fill-ink'
                      : 'fill-transparent stroke-ink',
                )}
                strokeWidth="0.7"
              />
              <text
                y="-4"
                textAnchor="middle"
                className="fill-ink-muted"
                style={{ fontSize: '3.4px' }}
              >
                {drone.name}
              </text>
            </g>
          )
        })}
      </svg>

      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-label">
        <span>{width.toFixed(0)} m × {height.toFixed(0)} m</span>
        <span>Filled = flying</span>
        {groups.size > 0 && <span>Dashed = linked as one group</span>}
      </figcaption>
    </figure>
  )
}

/** Whole-metre lines inside the range, capped so a large room does not become a mesh. */
function gridLines(low: number, high: number): number[] {
  const step = Math.ceil((high - low) / 12) || 1
  const lines: number[] = []
  for (let metre = Math.ceil(low); metre <= Math.floor(high); metre += step) lines.push(metre)
  return lines
}
