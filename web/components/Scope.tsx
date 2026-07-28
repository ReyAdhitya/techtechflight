import { useRef } from 'react'
import type { DroneState } from '@techtechflight/contract'
import { SEPARATION_WARNING_M, type DroneVitals } from '@/lib/vitals'
import { cn } from '@/lib/utils'

/**
 * Where the Drones are, looking down.
 *
 * The point is not navigation — nobody flies from this. It answers the question a
 * Teacher actually has when six Drones are up: *which one is that*, and *are two of them
 * about to meet*. Positions are metres from where the Fleet was set up, because a
 * classroom is a room rather than a map and a latitude helps nobody.
 *
 * Drones that have been linked into a group are joined by a line, so a formation reads
 * as one thing rather than as several Drones that happen to be near each other.
 *
 * What is drawn is a **window** — a square of space the display chose, never the flight
 * area, which ADR-0012 defers and `docs/adr/0014-a-fixed-scope-window.md` explains at
 * length. Nothing is drawn at its edge and no Alert derives from it.
 *
 * Two things are drawn in two different spaces, on purpose:
 *
 * - **The window** is an SVG whose user units *are metres*. Grid, ties and conflicts are
 *   geometry, and a viewBox measured in metres is what keeps a distance on screen meaning
 *   a distance between two Drones.
 * - **The Drones** are HTML, positioned as a percentage of that same box. A mark and a
 *   Drone Name are not geometry — they must stay the same size whether the window is 8 m
 *   or 32 m across, they must follow the Teacher's own font size (ADR-0008), and a mark
 *   a Teacher can select has to be a real control rather than a shape with a click on it.
 */
export function Scope({
  drones,
  vitals,
  selected,
  onSelect,
}: {
  drones: readonly DroneState[]
  /**
   * Supplied on the tower, absent on Reports. Its only job here is marking the pairs that
   * are too close — separation is derived, and nothing else is.
   *
   * The Drone Name and the height are **not** taken from it. Both come off `DroneState`, so
   * a screen that has no Vitals to give still gets a fully labelled picture rather than a
   * field of anonymous dots.
   */
  vitals?: readonly DroneVitals[]
  /** Which Drone the Teacher is looking at, so a mark and its strip point at each other. */
  selected?: string | null
  onSelect?: ((droneId: string) => void) | undefined
}) {
  /*
   * The window already on screen — its size and where its middle sits. Held across renders
   * because it is only allowed to change when a Drone has actually left it: recomputing
   * either freely puts the sliding grid back, the size by flipping between rungs and the
   * centre by following the Fleet. Writing it during render is safe because the write is
   * idempotent — the same props give the same window, twice or once.
   */
  const held = useRef<WindowChoice | undefined>(undefined)

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

  const scope = scopeWindow(placed, held.current)
  held.current = scope.choice
  const stepM = gridStepM(scope.widthM)
  const conflicts = conflictPairs(placed, vitals)

  const groups = new Map<string, DroneState[]>()
  for (const drone of placed) {
    const groupId = drone.telemetry?.linkGroupId
    if (!groupId) continue
    groups.set(groupId, [...(groups.get(groupId) ?? []), drone])
  }

  return (
    /*
     * Capped and centred rather than filling the column.
     *
     * A square scope on a full-width board is taller than a laptop viewport on its own, and
     * it pushed every flight strip below the fold. The strips are where the Teacher works;
     * the scope answers "which one is that". A picture that costs a whole screen has the two
     * the wrong way round.
     *
     * In rem, so the cap follows the display scale like everything else does — LARGE FORMAT
     * grows the scope with the type rather than stranding it at a fixed size (ADR-0008).
     */
    <figure className="mx-auto my-0 flex w-full max-w-[37.5rem] flex-col gap-3">
      {/*
       * Square, always. `meet` then has nothing to letterbox, the percentage positions of
       * the Drones above line up exactly with the metres below, and a metre across is the
       * same length as a metre down — which is what makes the cells square.
       *
       * Inline rather than `aspect-square` so the invariant is assertable: the suite is
       * jsdom, which has no layout engine and cannot see a wrong aspect ratio, but it can
       * read an inline style (CLAUDE.md).
       */}
      <div
        className="relative w-full rounded-surface border border-hairline bg-canvas"
        style={{ aspectRatio: '1' }}
      >
        <svg
          viewBox={`0 0 ${scope.widthM} ${scope.heightM}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          role="img"
          /*
           * "in the room" would be the one claim ADR-0014 exists to deny — that this frame
           * is the space the Drones may fly in. A sighted Teacher sees a picture with no
           * walls drawn and reads it correctly; a Teacher on a screen reader was being told
           * the opposite, which makes it an accessibility defect rather than a wording one.
           */
          aria-label={`Where ${placed.length} Drones are, looking down`}
        >
          {/* A fixed grid, so a distance on screen can be read as a distance in metres. */}
          {gridLines(scope.westM, scope.eastM, stepM).map((metre) => (
            <line
              key={`v${metre}`}
              x1={scope.project(metre, 0).x}
              x2={scope.project(metre, 0).x}
              y1="0"
              y2={scope.heightM}
              className="stroke-hairline"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {gridLines(scope.southM, scope.northM, stepM).map((metre) => (
            <line
              key={`h${metre}`}
              x1="0"
              x2={scope.widthM}
              y1={scope.project(0, metre).y}
              y2={scope.project(0, metre).y}
              className="stroke-hairline"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Linked Drones first, so the tie sits under the Drones it joins. */}
          {[...groups.values()].map((members) =>
            members.slice(1).map((drone, index) => {
              const from = scope.projectOf(members[index]!)
              const to = scope.projectOf(drone)
              return (
                <line
                  key={`${members[index]!.id}-${drone.id}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className="stroke-status-not-ready"
                  strokeWidth="2"
                  strokeDasharray="6 5"
                  vectorEffect="non-scaling-stroke"
                />
              )
            }),
          )}

          {/*
           * Pairs that are too close, drawn solid and heavy so they read differently from
           * the dashed tie between Drones that are linked on purpose. Two aircraft joined
           * by a line here is the one thing on this map that means act now.
           */}
          {conflicts.map((pair) => {
            const from = scope.project(pair.from.eastM, pair.from.northM)
            const to = scope.project(pair.to.eastM, pair.to.northM)
            return (
              <line
                key={pair.key}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className="stroke-status-fault"
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>

        {placed.map((drone, index) => (
          <Mark
            key={drone.id}
            drone={drone}
            scope={scope}
            altitudeM={drone.telemetry?.altitudeM}
            selected={selected === drone.id}
            onSelect={onSelect}
            // Labels alternate above and below the mark. Six Drones in a classroom sit
            // roughly a metre apart, which is wide enough for a name at the Teacher's
            // font size — but not for two names on the same line when they close up.
            below={index % 2 === 1}
          />
        ))}
      </div>

      {/*
       * Keys to the symbols, and nothing that claims a size.
       *
       * "Grid: 0.5 m" used to head this list. It read as a claim about what a cell measures
       * on the glass, and every monitor is a different size, so on screen it could never be
       * true. The grid itself is unchanged — half-metre cells, fixed window, snapped centre.
       * With each Drone's height now written on its own mark, the readable quantity is on
       * the Drone rather than in a legend, which is where it was always more use.
       */}
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-label">
        <span>Filled = flying</span>
        {groups.size > 0 && <span>Dashed = linked as one group</span>}
        {conflicts.length > 0 && <span>Solid = too close</span>}
        {scope.beyond.length > 0 && (
          <span>
            {namesOf(scope.beyond)} {scope.beyond.length === 1 ? 'is' : 'are'} further out than
            the scope draws, held on the edge
          </span>
        )}
      </figcaption>
    </figure>
  )
}

/**
 * One Drone on the map: the mark, its name, and how high it is.
 *
 * HTML rather than SVG text. Inside the drawing these would be sized in user units, so
 * they would grow with a small window and shrink with a large one, and they would ignore
 * the Teacher's browser font size and the large format entirely — the one place on the
 * board where a size was not relative (ADR-0008). Six "On the ground" labels in a 7 m
 * strip overlapped into one unreadable line because of it.
 */
function Mark({
  drone,
  scope,
  altitudeM,
  selected,
  onSelect,
  below,
}: {
  drone: DroneState
  scope: ScopeWindow
  /**
   * Height above this Drone's own take-off point.
   *
   * `undefined` means the airframe cannot measure height at all, and it must be drawn as
   * nothing rather than as `0.0 m`. A Drone with no barometer and a Drone sitting on the
   * floor are different facts, and a Teacher who reads one as the other is being misled by
   * the board (`docs/DESIGN.md` §11.1).
   */
  altitudeM: number | undefined
  selected: boolean
  onSelect: ((droneId: string) => void) | undefined
  below: boolean
}) {
  const at = scope.percentOf(drone)
  const airborne = drone.status === 'Flying'

  const dot = (
    <span
      aria-hidden="true"
      className={cn(
        'block rounded-full border-2 transition-colors',
        // Filled = flying, as the caption says. Fault takes the Status colour; everything
        // else is ink, because colour on this board means exception (design.md §9).
        airborne ? 'size-3.5' : 'size-3',
        drone.status === 'Fault'
          ? 'border-status-fault bg-status-fault'
          : airborne
            ? 'border-ink bg-ink'
            : 'border-ink bg-transparent',
      )}
    />
  )

  /*
   * Absolutely placed around the mark rather than stacked with it.
   *
   * The mark is where the Drone *is*, so it has to sit on the projected point exactly.
   * Laying the name and the mark out as a column and centring the pair would move the
   * mark by half the label block — and by a different amount above than below, so a row
   * of Drones standing in a line would draw as a zigzag.
   */
  const labels = (
    <span
      className={cn(
        'absolute left-1/2 flex -translate-x-1/2 flex-col items-center whitespace-nowrap leading-tight',
        below ? 'top-full mt-0.5' : 'bottom-full mb-0.5',
      )}
    >
      <span className="text-label text-ink-muted">{drone.name}</span>
      {/*
       * The height, not the phase word. "Level" told a Teacher the Drone was holding its
       * height without telling them *what* height, and the number is the thing they can act
       * on. The phase is still on that Drone's flight strip, in words.
       *
       * The second line goes on a narrow screen; the Drone Name never does. Six labels in a
       * short strip overlap into one unreadable line, and the second line is what makes them
       * do it. The name stays at every width, because "which one is that" is the question
       * the scope exists to answer — a scope of anonymous dots is not a smaller scope, it is
       * a useless one.
       */}
      {altitudeM !== undefined && (
        <span className="hidden text-label text-ink-subtle sm:block">
          {altitudeM.toFixed(1)} m
        </span>
      )}
    </span>
  )

  const position = {
    left: `${at.xPercent}%`,
    top: `${at.yPercent}%`,
  } as const

  if (!onSelect) {
    return (
      <span
        aria-hidden="true"
        className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={position}
      >
        {dot}
        {labels}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(drone.id)}
      aria-pressed={selected}
      /*
       * A finger is wider than a dot, so the target is padded out around the mark rather
       * than being the mark itself — and it is a button, so the linked selection the
       * scope exists for works from a keyboard too (docs/DESIGN.md §11.3).
       */
      className={cn(
        'absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-2.5',
        // A ring rather than a colour change, so "which one is that" is answered for a
        // Teacher who cannot pick a highlight out on a bright projector.
        selected && 'outline outline-2 outline-offset-0 outline-ink',
      )}
      style={position}
    >
      {dot}
      {labels}
    </button>
  )
}

/**
 * The square the scope is drawing: how big, and where its middle is.
 *
 * Both are chosen once and then held. `Scope` keeps the last one in a ref and hands it back
 * on the next Fleet State, which is what stops the picture drifting under the Drones.
 */
export interface WindowChoice {
  readonly sideM: number
  readonly centreEastM: number
  readonly centreNorthM: number
}

export interface ScopeWindow {
  readonly westM: number
  readonly eastM: number
  readonly southM: number
  readonly northM: number
  readonly widthM: number
  readonly heightM: number
  readonly aspectRatio: number
  /** What was chosen, to be handed back on the next render so it can be kept. */
  readonly choice: WindowChoice
  /**
   * The Drones the largest window could not reach, drawn on its edge rather than dropped.
   * Empty at every rung below the last, because the window grows to hold them instead.
   */
  readonly beyond: readonly DroneState[]
  /**
   * Metres to viewBox units — which is to say, no scaling at all. North is up.
   *
   * A point outside the window is held on its edge. Nothing may be drawn off the frame: a
   * Drone missing from the scope reads as a Drone that is not flying.
   */
  readonly project: (eastM: number, northM: number) => { x: number; y: number }
  readonly projectOf: (drone: DroneState) => { x: number; y: number }
  /** The same point as a percentage of the box, for the HTML layer over the drawing. */
  readonly percentOf: (drone: DroneState) => { xPercent: number; yPercent: number }
}

/**
 * The square windows the scope may draw in, in metres, smallest first.
 *
 * A ladder rather than a fitted size, because a window that fits is a window that moves.
 * Five rungs cover a corner of a classroom up to a sports hall.
 *
 * Exported so the test iterates the ladder itself. A copy of it in the test would go on
 * passing over the five rungs it had been told about while a sixth broke the rule.
 */
export const WINDOW_SIDES_M = [8, 12, 16, 24, 32] as const

/** True when every Drone is inside the window, edges included. */
function holds(placed: readonly DroneState[], within: WindowChoice): boolean {
  const halfM = within.sideM / 2
  return placed.every((drone) => {
    const position = drone.telemetry!.position!
    return (
      Math.abs(position.eastM - within.centreEastM) <= halfM &&
      Math.abs(position.northM - within.centreNorthM) <= halfM
    )
  })
}

/** Halfway between the outermost two, or the setup point when there is nothing to average. */
function midpointOf(values: readonly number[]): number {
  if (values.length === 0) return 0
  let low = values[0]!
  let high = values[0]!
  for (const value of values) {
    if (value < low) low = value
    if (value > high) high = value
  }
  return (low + high) / 2
}

/**
 * Where to draw, and how much: the picture's own decision, made as rarely as it can be.
 *
 * **A held window is kept while it still holds every Drone.** This is the whole discipline.
 * Recomputing a centre that follows the Fleet is the original bug wearing a different hat —
 * the frame slides under the Drones and they read as standing still. So the window is only
 * ever reconsidered when a Drone has actually left it, which is rare and visible.
 *
 * **When it is reconsidered, it centres on the Drones and snaps to a whole cell.** Centring
 * on the setup point drew a Fleet that had been set up in a corner into a corner, with half
 * the picture empty. Centring on the Fleet fixes that; snapping the centre to a multiple of
 * the cell is what keeps the rules falling on the same metres they always did, so a window
 * that has to move moves by whole cells and never by a fraction of one.
 *
 * **The side never shrinks**, for the reason it never did: a Drone hovering on a rung
 * boundary would otherwise flip it between two sizes.
 */
function chooseWindow(placed: readonly DroneState[], held: WindowChoice | undefined): WindowChoice {
  if (held && holds(placed, held)) return held

  const positions = placed.map((drone) => drone.telemetry!.position!)
  const towardsEastM = midpointOf(positions.map((position) => position.eastM))
  const towardsNorthM = midpointOf(positions.map((position) => position.northM))

  /*
   * Snapping can push the centre by up to half a cell, which can push a Drone out of a rung
   * that fitted before the snap — so each rung is tested after its own snap, rather than
   * picked from the raw reach and hoped for.
   */
  const snapped = (sideM: number): WindowChoice => {
    const stepM = gridStepM(sideM)
    return {
      sideM,
      centreEastM: Math.round(towardsEastM / stepM) * stepM,
      centreNorthM: Math.round(towardsNorthM / stepM) * stepM,
    }
  }

  for (const sideM of WINDOW_SIDES_M) {
    if (sideM < (held?.sideM ?? 0)) continue
    const candidate = snapped(sideM)
    if (holds(placed, candidate)) return candidate
  }

  // Past the last rung. The Drones that do not fit are held on the edge and named.
  return snapped(WINDOW_SIDES_M[WINDOW_SIDES_M.length - 1]!)
}

/**
 * The window the scope draws in: a fixed square, centred on the Drones inside it.
 *
 * Exported for its own test. Three properties matter, and all three were once absent.
 *
 * **It does not follow the Drones.** The bounds used to be the Fleet's own extent plus a
 * metre, recomputed on every Fleet State — so `percentOf` renormalised each Drone into a box
 * that had just moved with it. A Drone flying east while the east edge went east with it
 * landed on nearly the same percentage, and the picture read as a sliding grid around
 * stationary Drones, which is the opposite of what was happening. `held` is the window
 * already on screen, and it is kept for as long as it holds every Drone.
 *
 * **A metre is the same length whichever way it is measured.** East and north were once
 * normalised to 0–100 *independently* and the result forced into a 4:3 box, so the one thing
 * this picture exists to show — whether two Drones are about to meet — could not be read off
 * it. The viewBox is in metres, so the scale is 1 and cannot drift, and a square window makes
 * the cells square with no further work.
 *
 * **Nothing is silently dropped.** A Drone past the largest rung is held on the frame's edge
 * and named in the caption.
 *
 * The window is a property of the display and never a claim about the room — see
 * `docs/adr/0014-a-fixed-scope-window.md`, which exists because without it this reads as the
 * flight area ADR-0012 deferred.
 */
export function scopeWindow(placed: readonly DroneState[], held?: WindowChoice): ScopeWindow {
  const chosen = chooseWindow(placed, held)
  const halfM = chosen.sideM / 2

  const westM = chosen.centreEastM - halfM
  const eastM = chosen.centreEastM + halfM
  const southM = chosen.centreNorthM - halfM
  const northM = chosen.centreNorthM + halfM

  /*
   * Held on the edge rather than drawn off the frame. This only bites past the last rung —
   * below it the window grows instead — and it is the honest answer there, because a Drone
   * absent from the scope reads as a Drone that is not flying. The caption names it.
   */
  const hold = (metres: number, low: number, high: number) =>
    Math.min(high, Math.max(low, metres))

  const project = (east: number, north: number) => ({
    x: hold(east, westM, eastM) - westM,
    // North is up, so the axis is flipped: an image's y grows downward.
    y: northM - hold(north, southM, northM),
  })

  const projectOf = (drone: DroneState) => {
    const position = drone.telemetry!.position!
    return project(position.eastM, position.northM)
  }

  const beyond = placed.filter((drone) => !holds([drone], chosen))

  return {
    westM,
    eastM,
    southM,
    northM,
    widthM: chosen.sideM,
    heightM: chosen.sideM,
    aspectRatio: 1,
    choice: chosen,
    beyond,
    project,
    projectOf,
    percentOf: (drone) => {
      const { x, y } = projectOf(drone)
      return { xPercent: (x / chosen.sideM) * 100, yPercent: (y / chosen.sideM) * 100 }
    },
  }
}

/**
 * Every pair closer than the warning distance, each pair drawn once.
 *
 * Vitals record the conflict from both ends — A is near B and B is near A — so the pair
 * is keyed on the two ids sorted, and the second sighting is dropped rather than drawn
 * on top of the first.
 */
function conflictPairs(
  placed: readonly DroneState[],
  vitals: readonly DroneVitals[] | undefined,
): readonly {
  key: string
  from: { eastM: number; northM: number }
  to: { eastM: number; northM: number }
}[] {
  if (vitals === undefined) return []
  const byName = new Map(placed.map((drone) => [drone.name, drone]))
  const seen = new Set<string>()
  const pairs: { key: string; from: { eastM: number; northM: number }; to: { eastM: number; northM: number } }[] = []

  for (const entry of vitals) {
    if (entry.separationM === null || entry.separationM >= SEPARATION_WARNING_M) continue
    if (entry.conflictWith === null) continue
    const other = byName.get(entry.conflictWith)
    const mine = placed.find((drone) => drone.id === entry.droneId)
    if (!other?.telemetry?.position || !mine?.telemetry?.position) continue

    const key = [mine.id, other.id].sort().join('~')
    if (seen.has(key)) continue
    seen.add(key)
    pairs.push({ key, from: mine.telemetry.position, to: other.telemetry.position })
  }
  return pairs
}

/** "Drone 4" · "Drone 4 and Drone 5" · "Drone 4, Drone 5 and Drone 6". */
function namesOf(drones: readonly DroneState[]): string {
  const names = drones.map((drone) => drone.name)
  const last = names[names.length - 1] ?? ''
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${last}` : last
}

/** Cell sizes the grid may use, in metres, smallest first. */
const GRID_STEPS_M = [0.5, 1, 2] as const

/**
 * The band the cell count has to stay inside, across the window.
 *
 * Both ends matter. Above the ceiling the grid becomes a mesh; below the floor the cells are
 * too coarse to judge a distance against, which is the only reason the grid is drawn.
 */
const MIN_CELLS_ACROSS = 16
const MAX_CELLS_ACROSS = 24

/** Cells across the window, at the step the window chose. The rule the ladder must keep. */
export function cellsAcross(windowSideM: number): number {
  return windowSideM / gridStepM(windowSideM)
}

/**
 * Metres per grid cell, chosen from the window. Never from the Drones.
 *
 * | Window | Step | Cells across |
 * |---|---|---|
 * | 8 m | 0.5 m | 16 |
 * | 12 m | 0.5 m | 24 |
 * | 16 m | 1 m | 16 |
 * | 24 m | 1 m | 24 |
 * | 32 m | 2 m | 16 |
 *
 * Half a metre at the default window was chosen from a rendered comparison: on a laptop it
 * draws at roughly a centimetre a cell, which is the density a Teacher can judge a distance
 * against. It is a property of the display, not a claim about the room.
 *
 * It cannot stay at half a metre for every window — at 32 m that is 64 rules an axis and the
 * grid becomes a mesh — so the step is the smallest one landing inside the band. Because the
 * window is a rung of `WINDOW_SIDES_M` and nothing else, the step is exactly as stable as the
 * window is, which is to say it changes rarely and visibly.
 *
 * The table above is what today's ladder and today's steps happen to produce. It is not the
 * rule. **The rule is the band**, and it is asserted over the exported ladder in the test, so
 * a rung added later cannot quietly fall outside it.
 *
 * Nothing on screen states the step any more. The caption that did read as a claim about
 * what a cell measured on the glass, and every monitor is a different size, so it could not
 * be true there. It is exported for `cellsAcross` and for the test.
 */
export function gridStepM(windowSideM: number): number {
  const inBand = GRID_STEPS_M.find((step) => {
    const cells = windowSideM / step
    return cells >= MIN_CELLS_ACROSS && cells <= MAX_CELLS_ACROSS
  })
  /*
   * A rung no step can serve is a ladder that has drifted from its steps — a 6 m window, say,
   * is 12 cells at the finest step and 3 at the coarsest. Draw the finest rather than the
   * coarsest, because a grid that is too dense still reads and a grid of three cells does not,
   * and leave the test over the ladder to be the thing that says the pair no longer agree.
   */
  return inBand ?? GRID_STEPS_M[0]!
}

/**
 * Where the rules fall, in metres, at a fixed step across the window.
 *
 * The step used to be `Math.ceil((high - low) / 12)` — derived from the extent, so the
 * number of cells changed as the Fleet spread out or closed up. It is now a function of the
 * window alone, which is why the grid holds still.
 *
 * Both edges are left out: the frame already draws them, and a non-scaling stroke sitting on
 * the viewBox boundary is clipped to half its width, so an edge rule reads lighter than
 * every other one.
 */
function gridLines(lowM: number, highM: number, stepM: number): number[] {
  const cells = Math.round((highM - lowM) / stepM)
  const lines: number[] = []
  for (let index = 1; index < cells; index += 1) lines.push(lowM + index * stepM)
  return lines
}

