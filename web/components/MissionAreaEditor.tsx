'use client'

import { useCallback, useId, useRef, useState, type MouseEvent } from 'react'
import type { LocalPosition } from '@techtechflight/contract'
import { enclosesAnything, type Zone, type ZoneKind } from '@/lib/airspace'
import { cn } from '@/lib/utils'

/** Metres east and north shown on the drawing surface. */
const GRID_SIZE_M = 20

type DrawMode = ZoneKind

export type MissionAreaEditorProps = {
  readonly zones: readonly Zone[]
  readonly onChange: (zones: readonly Zone[]) => void
}

function missionZoneOf(zones: readonly Zone[]): Zone | undefined {
  return zones.find((zone) => zone.kind === 'mission')
}

function hasCompleteMissionZone(zones: readonly Zone[]): boolean {
  const mission = missionZoneOf(zones)
  return mission !== undefined && enclosesAnything(mission)
}

function noFlyCount(zones: readonly Zone[]): number {
  return zones.filter((zone) => zone.kind === 'no-fly').length
}

function defaultZoneName(kind: ZoneKind, zones: readonly Zone[]): string {
  if (kind === 'mission') return 'Mission Zone'
  return `No-fly Zone ${noFlyCount(zones) + 1}`
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
 * Draw the Mission Zone and any No-fly Zones in metres from the Fleet origin.
 *
 * Controlled: the parent owns `zones` and receives every edit through `onChange`. One
 * Mission Zone at most; No-fly Zones as many as the Teacher needs. Undo drops the last
 * point while a shape is open, or the last zone when nothing is being drawn.
 */
export function MissionAreaEditor({ zones, onChange }: MissionAreaEditorProps) {
  const baseId = useId()
  const nextZoneCounter = useRef(1)
  const [mode, setMode] = useState<DrawMode>('mission')
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)
  const [eastDraft, setEastDraft] = useState('4')
  const [northDraft, setNorthDraft] = useState('4')

  const activeZone = activeZoneId ? zones.find((zone) => zone.id === activeZoneId) : undefined
  const missionComplete = hasCompleteMissionZone(zones)
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
      if (mode === 'mission' && missionComplete && activeZone?.kind !== 'mission') return

      if (activeZone && activeZone.kind === mode) {
        onChange(
          zones.map((zone) =>
            zone.id === activeZone.id ? { ...zone, points: [...zone.points, point] } : zone,
          ),
        )
        return
      }

      if (mode === 'mission') {
        const draft = missionZoneOf(zones)
        if (draft && !enclosesAnything(draft)) {
          onChange(
            zones.map((zone) =>
              zone.id === draft.id ? { ...zone, points: [...zone.points, point] } : zone,
            ),
          )
          setActiveZoneId(draft.id)
          return
        }
        if (missionComplete) return
      }

      const created: Zone = {
        id: makeZoneId(),
        kind: mode,
        name: defaultZoneName(mode, zones),
        points: [point],
      }
      onChange([...zones, created])
      setActiveZoneId(created.id)
    },
    [activeZone, makeZoneId, missionComplete, mode, onChange, zones],
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

  const selectMode = useCallback(
    (next: DrawMode) => {
      setMode(next)
      setActiveZoneId(null)
    },
    [],
  )

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
      setMode(last.kind)
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

  const canAddMissionPoint = mode === 'mission' && !missionComplete
  const canAddNoFlyPoint = mode === 'no-fly'
  const canAddPoint = canAddMissionPoint || canAddNoFlyPoint

  return (
    <section
      className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5"
      aria-labelledby={`${baseId}-heading`}
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${baseId}-heading`} className="label m-0">
          Mission area
        </h2>
        <p className="m-0 text-value text-ink-subtle">
          Draw where the Mission happens and anywhere Drones must stay out of, in metres from
          where the Fleet was set up.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Drawing mode">
        <button
          type="button"
          aria-pressed={mode === 'mission'}
          disabled={missionComplete}
          onClick={() => selectMode('mission')}
          className={cn(
            'min-h-11 cursor-pointer rounded-pill border px-4 py-1.5 text-value',
            mode === 'mission'
              ? 'border-ink bg-ink text-canvas'
              : 'border-hairline bg-transparent text-ink hover:border-ink',
            missionComplete && 'cursor-not-allowed opacity-50 hover:border-hairline',
          )}
        >
          Draw Mission Zone
        </button>
        <button
          type="button"
          aria-pressed={mode === 'no-fly'}
          onClick={() => selectMode('no-fly')}
          className={cn(
            'min-h-11 cursor-pointer rounded-pill border px-4 py-1.5 text-value',
            mode === 'no-fly'
              ? 'border-ink bg-ink text-canvas'
              : 'border-hairline bg-transparent text-ink hover:border-ink',
          )}
        >
          Draw No-fly Zone
        </button>
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

      {!hasAnyGeometry ? (
        <div
          className="rounded-surface border border-dashed border-hairline bg-canvas px-4 py-6 text-center"
          data-testid="mission-area-empty"
        >
          <p className="m-0 text-body text-ink">
            {mode === 'mission'
              ? 'Tap the grid or add points to outline where this Mission happens.'
              : 'Tap the grid or add points around areas Drones must stay out of.'}
          </p>
          <p className="m-0 mt-2 text-value text-ink-muted">
            Each shape needs at least three points. Use Undo to remove the last point or the
            last zone.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-surface border border-hairline bg-canvas">
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
              if (zone.kind === 'mission') {
                return closed ? (
                  <polygon
                    key={zone.id}
                    points={pointList}
                    className="fill-ink/10 stroke-ink"
                    strokeWidth={0.15}
                    data-zone-kind="mission"
                  />
                ) : (
                  <polyline
                    key={zone.id}
                    points={pointList}
                    fill="none"
                    className="stroke-ink"
                    strokeWidth={0.15}
                    strokeDasharray="0.4 0.3"
                    data-zone-kind="mission"
                  />
                )
              }
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
                  className={zone.kind === 'mission' ? 'fill-ink' : 'fill-status-fault'}
                />
              )),
            )}
          </svg>
        </div>
      )}

      <fieldset
        disabled={!canAddPoint}
        className="m-0 flex flex-wrap items-end gap-3 rounded-surface border border-hairline bg-canvas p-3 disabled:opacity-50"
      >
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
              {' — '}
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
