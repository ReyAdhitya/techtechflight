import type { DroneState } from '@techtechflight/contract'
import { SEPARATION_WARNING_M, type DroneVitals } from '@/lib/vitals'
import { PHASE_PRESENTATION } from '@/lib/vitals-presentation'
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
 *
 * Two things are drawn in two different spaces, on purpose:
 *
 * - **The room** is an SVG whose user units *are metres*, inside a box shaped like the
 *   room. Grid, ties and conflicts are geometry, and geometry has to scale with the room
 *   or a distance on screen stops meaning a distance in it.
 * - **The Drones** are HTML, positioned as a percentage of that same box. A mark and a
 *   Drone Name are not geometry — they must stay the same size whether the room is 4 m
 *   or 40 m across, they must follow the Teacher's own font size (ADR-0008), and a mark
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
   * Supplied on the tower, absent on History. With it the scope labels each Drone with
   * what it is doing and marks pairs that are too close; without it the map stays the
   * plain "where was everything" picture History wants.
   */
  vitals?: readonly DroneVitals[]
  /** Which Drone the Teacher is looking at, so a mark and its strip point at each other. */
  selected?: string | null
  onSelect?: ((droneId: string) => void) | undefined
}) {
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

  const room = roomExtent(placed)
  const conflicts = conflictPairs(placed, vitals)

  const groups = new Map<string, DroneState[]>()
  for (const drone of placed) {
    const groupId = drone.telemetry?.linkGroupId
    if (!groupId) continue
    groups.set(groupId, [...(groups.get(groupId) ?? []), drone])
  }

  return (
    <figure className="m-0 flex flex-col gap-3">
      {/*
       * The box is shaped like the room, so `meet` has nothing to letterbox and the
       * percentage positions of the Drones above line up exactly with the metres below.
       */}
      <div
        className="relative w-full rounded-surface border border-hairline bg-canvas"
        style={{ aspectRatio: `${room.widthM} / ${room.heightM}` }}
      >
        <svg
          viewBox={`0 0 ${room.widthM} ${room.heightM}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`Positions of ${placed.length} Drones in the room`}
        >
          {/* A metre grid, so a distance on screen can be read as a distance in the room. */}
          {gridLines(room.westM, room.eastM).map((metre) => (
            <line
              key={`v${metre}`}
              x1={room.project(metre, 0).x}
              x2={room.project(metre, 0).x}
              y1="0"
              y2={room.heightM}
              className="stroke-hairline"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {gridLines(room.southM, room.northM).map((metre) => (
            <line
              key={`h${metre}`}
              x1="0"
              x2={room.widthM}
              y1={room.project(0, metre).y}
              y2={room.project(0, metre).y}
              className="stroke-hairline"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Linked Drones first, so the tie sits under the Drones it joins. */}
          {[...groups.values()].map((members) =>
            members.slice(1).map((drone, index) => {
              const from = room.projectOf(members[index]!)
              const to = room.projectOf(drone)
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
            const from = room.project(pair.from.eastM, pair.from.northM)
            const to = room.project(pair.to.eastM, pair.to.northM)
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
            room={room}
            phase={vitals?.find((entry) => entry.droneId === drone.id)?.phase}
            selected={selected === drone.id}
            onSelect={onSelect}
            // Labels alternate above and below the mark. Six Drones in a classroom sit
            // roughly a metre apart, which is wide enough for a name at the Teacher's
            // font size — but not for two names on the same line when they close up.
            below={index % 2 === 1}
          />
        ))}
      </div>

      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-label">
        <span>
          {room.widthM.toFixed(0)} m × {room.heightM.toFixed(0)} m
        </span>
        <span>Filled = flying</span>
        {groups.size > 0 && <span>Dashed = linked as one group</span>}
        {conflicts.length > 0 && <span>Solid = too close</span>}
      </figcaption>
    </figure>
  )
}

/**
 * One Drone on the map: the mark, its name, and what it is doing.
 *
 * HTML rather than SVG text. Inside the drawing these would be sized in user units, so
 * they would grow with a small room and shrink with a large one, and they would ignore
 * the Teacher's browser font size and the large format entirely — the one place on the
 * board where a size was not relative (ADR-0008). Six "On the ground" labels in a 7 m
 * strip overlapped into one unreadable line because of it.
 */
function Mark({
  drone,
  room,
  phase,
  selected,
  onSelect,
  below,
}: {
  drone: DroneState
  room: RoomExtent
  phase: DroneVitals['phase'] | undefined
  selected: boolean
  onSelect: ((droneId: string) => void) | undefined
  below: boolean
}) {
  const at = room.percentOf(drone)
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
      {phase && (
        <span className="text-label text-ink-subtle">{PHASE_PRESENTATION[phase].label}</span>
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

export interface RoomExtent {
  readonly westM: number
  readonly eastM: number
  readonly southM: number
  readonly northM: number
  readonly widthM: number
  readonly heightM: number
  readonly aspectRatio: number
  /** Metres to viewBox units — which is to say, no scaling at all. North is up. */
  readonly project: (eastM: number, northM: number) => { x: number; y: number }
  readonly projectOf: (drone: DroneState) => { x: number; y: number }
  /** The same point as a percentage of the box, for the HTML layer over the drawing. */
  readonly percentOf: (drone: DroneState) => { xPercent: number; yPercent: number }
}

/**
 * The piece of room the Fleet is standing in, padded by a metre.
 *
 * Exported for its own test. The whole scope rests on this staying isotropic: east and
 * north used to be normalised to 0–100 *independently* and the result forced into a 4:3
 * box, so a metre north and a metre east were different lengths on screen, and the one
 * thing this picture exists to show — whether two Drones are about to meet — could not be
 * read off it. Keeping the viewBox in metres means the scale is 1 and cannot drift.
 */
export function roomExtent(placed: readonly DroneState[]): RoomExtent {
  const easts = placed.map((drone) => drone.telemetry!.position!.eastM)
  const norths = placed.map((drone) => drone.telemetry!.position!.northM)

  // A metre of padding, and never a zero-width room when everything is in a line.
  const westM = Math.min(...easts) - 1
  const eastM = Math.max(...easts) + 1
  const southM = Math.min(...norths) - 1
  const northM = Math.max(...norths) + 1
  const widthM = Math.max(1, eastM - westM)
  const heightM = Math.max(1, northM - southM)

  const project = (east: number, north: number) => ({
    x: east - westM,
    // North is up, so the axis is flipped: an image's y grows downward.
    y: northM - north,
  })

  const projectOf = (drone: DroneState) => {
    const position = drone.telemetry!.position!
    return project(position.eastM, position.northM)
  }

  return {
    westM,
    eastM,
    southM,
    northM,
    widthM,
    heightM,
    aspectRatio: widthM / heightM,
    project,
    projectOf,
    percentOf: (drone) => {
      const { x, y } = projectOf(drone)
      return { xPercent: (x / widthM) * 100, yPercent: (y / heightM) * 100 }
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

/** Whole-metre lines inside the range, capped so a large room does not become a mesh. */
function gridLines(low: number, high: number): number[] {
  const step = Math.ceil((high - low) / 12) || 1
  const lines: number[] = []
  for (let metre = Math.ceil(low); metre <= Math.floor(high); metre += step) lines.push(metre)
  return lines
}
