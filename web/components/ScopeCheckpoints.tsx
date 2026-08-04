import type { MissionCheckpoint } from '@/lib/mission'
import type { ScopeView } from './Scope'

/** Metres — the inner mark stays readable without dominating the reach circle. */
const MARK_RADIUS_M = 0.35

export type ScopeCheckpointsProps = {
  readonly checkpoints: readonly MissionCheckpoint[]
  /** Which checkpoints a Drone has already reached — order comes from `checkpoints`. */
  readonly reachedIds: ReadonlySet<string>
  /** The scope's metre → viewBox projection, same one the grid uses. */
  readonly project: (eastM: number, northM: number) => { x: number; y: number }
  readonly view: ScopeView
}

/**
 * Checkpoint marks for the Scope SVG layer.
 *
 * Presentational only: the Integrator passes live reach state and composes this beside
 * grid lines and Drone marks. Checkpoints are horizontal claims, so nothing draws on Side
 * or Front — a reach radius on an elevation view would look like it had answered a
 * question nobody asked.
 *
 * Order is the Mission's array order and never changes when one is reached
 * (DELIBERATE-POSITIONS 1). Reached and unreached differ in shape and colour, and every
 * mark carries a word as well (ADR-0004).
 */
export function ScopeCheckpoints({
  checkpoints,
  reachedIds,
  project,
  view,
}: ScopeCheckpointsProps) {
  if (view !== 'top-down' || checkpoints.length === 0) return null

  const routePoints = checkpoints
    .map((checkpoint) => {
      const { x, y } = project(checkpoint.at.eastM, checkpoint.at.northM)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <g data-scope-checkpoints="" aria-hidden="false">
      {checkpoints.length >= 2 ? (
        <polyline
          points={routePoints}
          fill="none"
          className="stroke-ink-muted"
          strokeWidth="1.5"
          strokeDasharray="6 5"
          vectorEffect="non-scaling-stroke"
          data-checkpoint-route=""
        />
      ) : null}

      {checkpoints.map((checkpoint, index) => (
        <CheckpointMark
          key={checkpoint.id}
          checkpoint={checkpoint}
          order={index + 1}
          reached={reachedIds.has(checkpoint.id)}
          project={project}
        />
      ))}
    </g>
  )
}

function CheckpointMark({
  checkpoint,
  order,
  reached,
  project,
}: {
  readonly checkpoint: MissionCheckpoint
  readonly order: number
  readonly reached: boolean
  readonly project: (eastM: number, northM: number) => { x: number; y: number }
}) {
  const { x, y } = project(checkpoint.at.eastM, checkpoint.at.northM)
  const statusWord = reached ? 'reached' : 'not reached'
  const optionalWord = checkpoint.required ? '' : ', optional'
  const label = `Checkpoint ${order}, ${checkpoint.name}: ${statusWord}${optionalWord}`

  return (
    <g
      role="img"
      aria-label={label}
      data-checkpoint-id={checkpoint.id}
      data-checkpoint-order={order}
      data-reached={reached ? 'true' : 'false'}
      data-required={checkpoint.required ? 'true' : 'false'}
    >
      <circle
        cx={x}
        cy={y}
        r={checkpoint.radiusM}
        fill="none"
        className={reached ? 'stroke-status-ready' : 'stroke-status-not-ready'}
        strokeWidth="1.5"
        strokeDasharray={reached ? undefined : '5 4'}
        vectorEffect="non-scaling-stroke"
        data-checkpoint-radius=""
      />

      {reached ? (
        <circle
          cx={x}
          cy={y}
          r={MARK_RADIUS_M}
          className="fill-status-ready stroke-status-ready"
          strokeWidth="1.5"
          data-shape="filled"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        <polygon
          points={diamondPoints(x, y, MARK_RADIUS_M)}
          fill="none"
          className="stroke-status-not-ready"
          strokeWidth="1.5"
          data-shape="diamond"
          vectorEffect="non-scaling-stroke"
        />
      )}

      <text
        x={x}
        y={y - checkpoint.radiusM - 0.25}
        textAnchor="middle"
        className="fill-ink text-caption"
        fontSize="0.55"
        data-checkpoint-label=""
      >
        {order}. {statusWord}
      </text>
    </g>
  )
}

function diamondPoints(cx: number, cy: number, radius: number): string {
  return `${cx},${cy - radius} ${cx + radius},${cy} ${cx},${cy + radius} ${cx - radius},${cy}`
}
