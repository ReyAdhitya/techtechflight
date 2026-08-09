'use client'

import { useCallback, useId, useRef, useState, type MouseEvent } from 'react'
import type { LocalPosition } from '@techtechflight/contract'
import { enclosesAnything, type Zone } from '@/lib/airspace'
import { cn } from '@/lib/utils'

/** Metres east and north shown on the drawing surface. */
const GRID_SIZE_M = 20

export type MissionAreaEditorProps = {
  readonly zones: readonly Zone[]
  readonly onChange: (zones: readonly Zone[]) => void
  /** Drop the heading and the card, because a Mission step already carries both. */
  readonly bare?: boolean
}

function defaultZoneName(zones: readonly Zone[]): string {
  return `No-fly Zone ${zones.length + 1}`
}

function roundMetre(value: number): number {
  return Math.max(0, Math.min(GRID_SIZE_M, Math.round(value * 10) / 10))
}

function svgY(northM: number): number {
  return GRID_SIZE_M - northM
}

function pointsToPolygon(points: readonly LocalPosition[]): string {
  return points.map((point) => `${point.eastM},${svgY(point.northM)}`).join(' ')
}

function polylinePoints(points: readonly LocalPosition[]): string {
  if (points.length === 0) return ''
  return pointsToPolygon(points)
}

/**
 * Draw the No-fly Zones, in metres from the Fleet origin.
 *
 * Controlled: the parent owns `zones` and receives every edit through `onChange`. As many
 * as the Teacher needs, and none is a normal answer. Undo drops the last point while a shape
 * is open, or the last zone when nothing is being drawn.
 *
 * There used to be a second mode for the Mission Zone, a boundary around where the class was
 * meant to stay. It went with ADR-0027: the net cage already says that, and a drawn boundary
 * that disagreed with the netting reported a breach for a Drone that was safely inside it.
 */
export function MissionAreaEditor({ zones, onChange, bare = false }: MissionAreaEditorProps) {
  const baseId = useId()
  const nextZoneCounter = useRef(1)
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [eastDraft, setEastDraft] = useState('4')
  const [northDraft, setNorthDraft] = useState('4')

  const activeZone = activeZoneId ? zones.find((zone) => zone.id === activeZoneId) : undefined
  const hasAnyGeometry = zones.some((zone) => zone.points.length > 0)

  const makeZoneId = useCallback(() => {
    const id = `zone-${nextZoneCounter.current}`
    nextZoneCounter.current += 1
    return id
  }, [])

  const replaceZone = useCallback(
    (zoneId: string, next: Zone) => {
      onChange(zones.map((zone) => (zone.id === zoneId ? next : zone)))
    },
    [onChange, zones],
  )

  const removeZone = useCallback(
    (zoneId: string) => {
      onChange(zones.filter((zone) => zone.id !== zoneId))
      if (activeZoneId === zoneId) setActiveZoneId(null)
    },
    [activeZoneId, onChange, zones],
  )

  const addPoint = useCallback(
    (point: LocalPosition) => {
      if (activeZone) {
        onChange(
          zones.map((zone) =>
            zone.id === activeZone.id ? { ...zone, points: [...zone.points, point] } : zone,
          ),
        )
        return
      }

      const created: Zone = {
        id: makeZoneId(),
        kind: 'no-fly',
        name: defaultZoneName(zones),
        points: [point],
      }
      onChange([...zones, created])
      setActiveZoneId(created.id)
    },
    [activeZone, makeZoneId, onChange, zones],
  )

  const addPointFromDraft = useCallback(() => {
    const eastM = roundMetre(Number.parseFloat(eastDraft))
    const northM = roundMetre(Number.parseFloat(northDraft))
    if (!Number.isFinite(eastM) || !Number.isFinite(northM)) return
    addPoint({ eastM, northM })
  }, [addPoint, eastDraft, northDraft])

  const finishActiveZone = useCallback(() => {
    setActiveZoneId(null)
  }, [])

  const undo = useCallback(() => {
    if (activeZone && activeZone.points.length > 0) {
      const shorter = activeZone.points.slice(0, -1)
      if (shorter.length === 0) {
        removeZone(activeZone.id)
        return
      }
      replaceZone(activeZone.id, { ...activeZone, points: shorter })
      return
    }

    if (zones.length === 0) return
    const last = zones[zones.length - 1]
    if (!last) return

    if (last.points.length > 1) {
      replaceZone(last.id, { ...last, points: last.points.slice(0, -1) })
      setActiveZoneId(last.id)
      return
    }

    removeZone(last.id)
  }, [activeZone, removeZone, replaceZone, zones])

  const onCanvasClick = (event: MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const eastM = roundMetre(((event.clientX - rect.left) / rect.width) * GRID_SIZE_M)
    const northM = roundMetre(
      ((rect.height - (event.clientY - rect.top)) / rect.height) * GRID_SIZE_M,
    )
    addPoint({ eastM, northM })
  }

  return (
    <section
      className={cn(
        'flex flex-col gap-4',
        !bare && 'rounded-surface border border-hairline bg-surface-1 p-5',
      )}
      aria-label={bare ? 'Mission area' : undefined}
      aria-labelledby={bare ? undefined : `${baseId}-heading`}
    >
      {bare ? null : (
        <div className="flex flex-col gap-1">
          <h2 id={`${baseId}-heading`} className="label m-0">
            Mission area
          </h2>
          <p className="m-0 text-value text-ink-subtle">
            Draw anywhere Drones must stay out of, in metres from where the Fleet was set up.
            None is a normal answer.
          </p>
        </div>
      )}

      {/*
       * No mode buttons. There were two, and with one kind of zone left a pressed pill that
       * can never be unpressed is chrome that says nothing.
       */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={zones.length === 0}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Undo
        </button>
        {activeZone && activeZone.points.length > 0 ? (
          <button
            type="button"
            onClick={finishActiveZone}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
          >
            Finish zone
          </button>
        ) : null}
      </div>

      {/*
       * The grid is always here, empty or not. It used to be swapped out for the sentence
       * below, which left "Tap the grid" as an instruction pointing at nothing — the one
       * state every Teacher starts in, and the only way in was to type two numbers.
       *
       * That sentence sits *under* the surface rather than over it so that the surface
       * cannot move: it goes away on the first point, and above the grid that shifts the
       * grid out from under the finger that is drawing on it, between tap one and tap two.
       *
       * Capped rather than `w-full`: this sits in the Lesson column, and a square that
       * tracks the column width pushes Add point and the zone list off the screen.
       */}
      <div className="mx-auto w-full max-w-[26rem] overflow-hidden rounded-surface border border-hairline bg-canvas">
        <svg
          role="img"
          aria-label="Mission area drawing surface in metres east and north"
          viewBox={`0 0 ${GRID_SIZE_M} ${GRID_SIZE_M}`}
          className="block aspect-square w-full cursor-crosshair touch-none"
          onClick={onCanvasClick}
        >
          {Array.from({ length: GRID_SIZE_M + 1 }, (_, index) => (
            <g key={index}>
              <line
                x1={index}
                y1={0}
                x2={index}
                y2={GRID_SIZE_M}
                className="stroke-hairline"
                strokeWidth={0.05}
              />
              <line
                x1={0}
                y1={index}
                x2={GRID_SIZE_M}
                y2={index}
                className="stroke-hairline"
                strokeWidth={0.05}
              />
            </g>
          ))}

          {zones.map((zone) => {
            if (zone.points.length === 0) return null
            const closed = enclosesAnything(zone)
            const pointList = closed ? pointsToPolygon(zone.points) : polylinePoints(zone.points)
            return closed ? (
              <polygon
                key={zone.id}
                points={pointList}
                className="fill-status-fault/15 stroke-status-fault"
                strokeWidth={0.15}
                strokeDasharray="0.3 0.25"
                data-zone-kind="no-fly"
              />
            ) : (
              <polyline
                key={zone.id}
                points={pointList}
                fill="none"
                className="stroke-status-fault"
                strokeWidth={0.15}
                strokeDasharray="0.4 0.3"
                data-zone-kind="no-fly"
              />
            )
          })}

          {zones.flatMap((zone) =>
            zone.points.map((point, index) => (
              <circle
                key={`${zone.id}-${index}`}
                cx={point.eastM}
                cy={svgY(point.northM)}
                r={0.2}
                className="fill-status-fault"
              />
            )),
          )}
        </svg>
      </div>

      {!hasAnyGeometry ? (
        <div className="text-center" data-testid="mission-area-empty">
          <p className="m-0 text-body text-ink">
            Tap the grid or add points around areas Drones must stay out of.
          </p>
          <p className="m-0 mt-2 text-value text-ink-muted">
            Each shape needs at least three points. Use Undo to remove the last point or the
            last zone.
          </p>
        </div>
      ) : null}

      {/* Always live. The typed path and the tapped path have to agree. */}
      <fieldset className="m-0 flex flex-wrap items-end gap-3 rounded-surface border border-hairline bg-canvas p-3">
          <legend className="label px-1">Add point (metres)</legend>
          <label className="flex flex-col gap-1">
            <span className="text-value text-ink-subtle">East</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={GRID_SIZE_M}
              step={0.5}
              value={eastDraft}
              onChange={(event) => setEastDraft(event.target.value)}
              className="min-h-11 w-24 rounded-pill border border-hairline bg-surface-1 px-3 py-1.5 text-value text-ink tnum"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-value text-ink-subtle">North</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={GRID_SIZE_M}
              step={0.5}
              value={northDraft}
              onChange={(event) => setNorthDraft(event.target.value)}
              className="min-h-11 w-24 rounded-pill border border-hairline bg-surface-1 px-3 py-1.5 text-value text-ink tnum"
            />
          </label>
          <button
            type="button"
            onClick={addPointFromDraft}
            className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-4 py-1.5 text-value font-medium text-canvas"
          >
            Add point
          </button>
      </fieldset>

      {zones.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-value text-ink-subtle">
          {zones.map((zone) => (
            <li key={zone.id}>
              <span className="font-medium text-ink">{zone.name}</span>
              {', '}
              <span className="tnum">{zone.points.length}</span>
              {zone.points.length === 1 ? ' point' : ' points'}
              {enclosesAnything(zone) ? '' : ' (still drawing)'}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
