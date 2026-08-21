'use client'

import { useCallback, useId, useRef, useState, type MouseEvent } from 'react'
import type { LocalPosition } from '@techtechflight/contract'
import { enclosesAnything, type Zone } from '@/lib/airspace'
import { CLASSROOM_GEOFENCE } from '@/lib/classroom-geofence'
import { zonesOutsideWindow, type ZoneWindow } from '@/lib/zone-visibility'
import { cn } from '@/lib/utils'

/**
 * The space to draw in when no Drone has reported a position yet.
 *
 * The classroom boundary, which is the one rectangle the Scope draws whatever else is on it.
 * It is a teaching default rather than a measurement, and that is fine here: it is the right
 * order of magnitude for a room, and every corner of it is somewhere the Scope will show.
 */
const DEFAULT_SPACE: ZoneWindow = CLASSROOM_GEOFENCE

export type MissionAreaEditorProps = {
  readonly zones: readonly Zone[]
  readonly onChange: (zones: readonly Zone[]) => void
  /** Drop the heading and the card, because a Mission step already carries both. */
  readonly bare?: boolean
  /**
   * The square of space the Scope is currently drawing, so this can say when a zone falls
   * outside it. Null before any Drone reports a position: there is no window then, and
   * *outside* would be a guess.
   */
  readonly scopeSpace?: ZoneWindow | null
}

function defaultZoneName(zones: readonly Zone[]): string {
  return `No-fly Zone ${zones.length + 1}`
}

function roundTo(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, Math.round(value * 10) / 10))
}

/**
 * North is up, so the axis is flipped, and the viewBox starts at `-northM`.
 *
 * Plotting `-north` rather than `top - north` is what lets the same expression serve a window
 * that starts at a negative metre. The classroom sits astride its own origin: the Fleet is set
 * up somewhere in the middle of the room, so half of it is west and south of zero.
 */
function svgY(northM: number): number {
  return -northM
}

function pointsToPolygon(points: readonly LocalPosition[]): string {
  return points.map((point) => `${point.eastM},${svgY(point.northM)}`).join(' ')
}

function polylinePoints(points: readonly LocalPosition[]): string {
  if (points.length === 0) return ''
  return pointsToPolygon(points)
}

/** Every whole metre line inside the window, on one axis. */
function metreLines(low: number, high: number): readonly number[] {
  const lines: number[] = []
  for (let m = Math.ceil(low); m <= Math.floor(high); m += 1) lines.push(m)
  return lines
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
export function MissionAreaEditor({
  zones,
  onChange,
  bare = false,
  scopeSpace = null,
}: MissionAreaEditorProps) {
  const baseId = useId()
  const nextZoneCounter = useRef(1)
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null)

  /*
   * **Draw the classroom.** This surface used to be a fixed twenty metres square running
   * from the origin north-east, and then it followed the Scope's fleet-centred window. The
   * Scope follows the Drones; a row parked east of the origin pulled that window east and
   * left the west of the room off the picture. A Teacher drawing on this grid is placing a
   * zone against the room, so the metres here are the room's (`CLASSROOM_GEOFENCE`). The
   * notice at the foot still uses the Scope's window, so a zone the picture will not show
   * is named rather than left as a silent miss.
   */
  const space = DEFAULT_SPACE
  const noticeWindow = scopeSpace ?? DEFAULT_SPACE
  const widthM = space.eastM - space.westM
  const heightM = space.northM - space.southM
  const midEast = Math.round((space.westM + space.eastM) / 2)
  const midNorth = Math.round((space.southM + space.northM) / 2)

  const [eastDraft, setEastDraft] = useState(String(midEast))
  const [northDraft, setNorthDraft] = useState(String(midNorth))

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
    const east = Number.parseFloat(eastDraft)
    const north = Number.parseFloat(northDraft)
    if (!Number.isFinite(east) || !Number.isFinite(north)) return
    addPoint({
      eastM: roundTo(east, space.westM, space.eastM),
      northM: roundTo(north, space.southM, space.northM),
    })
  }, [addPoint, eastDraft, northDraft, space.eastM, space.northM, space.southM, space.westM])

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
    const east = space.westM + ((event.clientX - rect.left) / rect.width) * widthM
    const north =
      space.southM + ((rect.height - (event.clientY - rect.top)) / rect.height) * heightM
    addPoint({
      eastM: roundTo(east, space.westM, space.eastM),
      northM: roundTo(north, space.southM, space.northM),
    })
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
          viewBox={`${space.westM} ${-space.northM} ${widthM} ${heightM}`}
          /* The window's own shape, which is not square once it is a room rather than a grid. */
          style={{ aspectRatio: `${widthM} / ${heightM}` }}
          className="block w-full cursor-crosshair touch-none"
          onClick={onCanvasClick}
          data-space={`${space.westM},${space.eastM},${space.southM},${space.northM}`}
        >
          {metreLines(space.westM, space.eastM).map((east) => (
            <line
              key={`e${east}`}
              x1={east}
              y1={svgY(space.northM)}
              x2={east}
              y2={svgY(space.southM)}
              className="stroke-hairline"
              strokeWidth={0.03}
            />
          ))}
          {metreLines(space.southM, space.northM).map((north) => (
            <line
              key={`n${north}`}
              x1={space.westM}
              y1={svgY(north)}
              x2={space.eastM}
              y2={svgY(north)}
              className="stroke-hairline"
              strokeWidth={0.03}
            />
          ))}

          {/*
           * The classroom boundary, in the same blue dashed line the Scope draws it in
           * (ADR-0033). A Teacher drawing a zone is placing it against the room, and the room
           * was the one thing this surface did not show.
           */}
          <rect
            x={CLASSROOM_GEOFENCE.westM}
            y={svgY(CLASSROOM_GEOFENCE.northM)}
            width={CLASSROOM_GEOFENCE.eastM - CLASSROOM_GEOFENCE.westM}
            height={CLASSROOM_GEOFENCE.northM - CLASSROOM_GEOFENCE.southM}
            fill="none"
            className="stroke-info"
            strokeWidth={0.06}
            strokeDasharray="0.3 0.24"
            data-classroom-geofence=""
          />

          {zones.map((zone) => {
            if (zone.points.length === 0) return null
            const closed = enclosesAnything(zone)
            const pointList = closed ? pointsToPolygon(zone.points) : polylinePoints(zone.points)
            return closed ? (
              <polygon
                key={zone.id}
                points={pointList}
                className="fill-status-fault/15 stroke-status-fault"
                strokeWidth={0.08}
                strokeDasharray="0.2 0.16"
                data-zone-kind="no-fly"
              />
            ) : (
              <polyline
                key={zone.id}
                points={pointList}
                fill="none"
                className="stroke-status-fault"
                strokeWidth={0.08}
                strokeDasharray="0.24 0.2"
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
                r={0.1}
                className="fill-status-fault"
              />
            )),
          )}
        </svg>
      </div>

      <p className="m-0 text-center text-label text-ink-muted">
        <span className="tnum">{space.westM}</span> to <span className="tnum">{space.eastM}</span>{' '}
        m east, <span className="tnum">{space.southM}</span> to{' '}
        <span className="tnum">{space.northM}</span> m north. The same space the Scope draws.
      </p>

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
              min={space.westM}
              max={space.eastM}
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
              min={space.southM}
              max={space.northM}
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

      <ZonesOutsideNotice zones={zones} window={noticeWindow} />
    </section>
  )
}

/**
 * The zones that are real and invisible.
 *
 * This surface now draws the same space the Scope does, so a tapped zone lands where it will
 * be shown and this is the exception rather than every Teacher's normal state. It is still
 * reachable: a corner typed past the edge is clamped to it, but a zone saved when the window
 * was elsewhere keeps the metres it was given.
 *
 * The failure mode is not an ugly picture. A Teacher who cannot see a boundary stops believing
 * there is one, and watching it is the whole of what this feature is for.
 */
function ZonesOutsideNotice({
  zones,
  window,
}: {
  readonly zones: readonly Zone[]
  readonly window: ZoneWindow | null
}) {
  if (window === null) return null
  const missing = zonesOutsideWindow(zones.filter(enclosesAnything), window)
  if (missing.length === 0) return null

  return (
    <p
      role="status"
      className="m-0 max-w-[62ch] rounded-surface border-l-4 border-status-not-ready bg-canvas px-4 py-3 text-value text-ink"
    >
      {missing.map((zone) => zone.name).join(', ')}{' '}
      {missing.length === 1 ? 'is' : 'are'} outside the picture the Scope draws, which right
      now covers <span className="tnum">{window.westM}</span> to{' '}
      <span className="tnum">{window.eastM}</span> m east and{' '}
      <span className="tnum">{window.southM}</span> to{' '}
      <span className="tnum">{window.northM}</span> m north. The Alert still fires; nobody
      will see the line. Move it nearer the Drones.
    </p>
  )
}
