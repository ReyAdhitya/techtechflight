# Architecture

Phase 4. How the system is put together to meet [`REQUIREMENTS.md`](./REQUIREMENTS.md) and
[`DESIGN.md`](./DESIGN.md). No implementation — this is the shape, the seams, and the rules
that keep them.

New decisions here are recorded in
[ADR-0013](./adr/0013-the-fleet-core-runs-in-the-browser-too.md). Existing ones that
constrain everything below: ADR-0001 (the Telemetry Source seam), ADR-0002 (local-first),
ADR-0003 (the split), ADR-0005 (static export), ADR-0011 (commands reach the simulator only),
ADR-0012 (planner scope).

---

## 1. Shape of the system

Four workspaces after the changes in ADR-0010 and ADR-0013.

```
contract/        Types and the seams. No logic, no behaviour, no dependencies.
                 The only thing every other workspace shares.

fleet-core/      Owns the Fleet. Status derivation, ageing into Stale and Offline,
                 the charge forecast, event history, and the simulated Telemetry
                 Source. Pure TypeScript — NO Node APIs, ever.
                 Runs in Node and in the browser, unchanged.

ground-station/  Node only: the HTTP server, the WebSocket, the process, and
                 (later) any hardware-bound Telemetry Source.

web/             The board. Next.js, static export, no server (ADR-0005).
```

`dashboard/` is gone (ADR-0010).

The split is now drawn where the Node dependency actually is, which is the honest place for
it. `ground-station/` keeps `server.ts` and `main.ts` because those are the only two files in
it that ever touched `node:` — verified, not assumed.

---

## 2. The two seams

Everything in this document hangs off these, and they are orthogonal.

```
        ┌────────────────────────────────────────────┐
        │  Screens                                   │
        │  read a FleetSnapshot and cannot tell      │
        │  where it came from                        │
        └────────────────────────────────────────────┘
                            ▲
   Seam 2 ── FleetLink ─────┼──────────────────────────
                            │
        SocketFleetLink     │     LocalFleetLink
        (across a socket)   │     (in this browser)
                            ▼
        ┌────────────────────────────────────────────┐
        │  Fleet core — ONE implementation           │
        │  GroundStation · status · charge · history │
        └────────────────────────────────────────────┘
                            ▲
   Seam 1 ── TelemetrySource┼────────────────── ADR-0001
                            │
     SimulatedTelemetrySource   │   RadioTelemetrySource
                                    (does not exist yet)
```

**Seam 1** answers *where does Telemetry come from* — a simulation or an aircraft.
**Seam 2** answers *where is the Fleet core running* — this browser, or the other end of a
socket.

A screen sits above both and knows neither. That is the property that makes hardware
integration a new class rather than a rewrite.

### 2.1 Why the UI does not consume a Telemetry Source directly

The Phase 3 instruction was *"the UI must communicate through Telemetry Source interfaces."*
Taken literally that would put raw `TelemetryObservation`s into components, and it must not:
**Status is derived by whatever owns the Fleet, never by a board.** That invariant is stated
in `contract/src/index.ts` and exists so two boards on one Fleet cannot disagree about what
they are looking at.

The intent behind the instruction is met more completely by the two-seam arrangement.
Swapping simulation for hardware replaces one implementation of seam 1 and touches neither
the Fleet core nor a single component — which is what "replace the source, don't rewrite the
application" actually asks for.

---

## 3. Telemetry data flow

### 3.1 Browser simulation — the Vercel deploy, and `/demo`

```
SimulatedTelemetrySource          in the browser
  │ TelemetryObservation, every 1,000 ms, per Drone
  │ a Drone off the air emits NOTHING — silence is absence
  ▼
GroundStation                     the same class the Node process uses
  │ stamps Last Contact · records a charge sample
  │ derives Status · ages Stale → Offline on a 1 s tick
  │ publishes only when the Fleet actually changed
  ▼
FleetHistoryRecorder              derives FleetEvents from transitions
  ▼
LocalFleetLink                    adapts both into a FleetSnapshot
  ▼
FleetProvider ──▶ screens
```

### 3.2 A school — ground station across the network

```
TelemetrySource (simulated today, hardware later)
  ▼
GroundStation · FleetHistoryRecorder        in the Node process
  ▼
startFleetServer          ws://…:4321/fleet
  │ on connect: fleet-state, then fleet-history; then streams events
  ▼
SocketFleetLink           reconnects with backoff, retains last state,
  │                       merges streamed events by id
  ▼
FleetProvider ──▶ screens
```

**The snapshot is identical in both.** That is the requirement `LocalFleetLink` exists to
meet, and the reason no screen may branch on which link it has.

### 3.3 Why the whole Fleet, every time

`FleetState` is a complete description rather than a delta stream. Fleets are six to eight
Drones, the payload is trivial, and sending everything removes an entire class of
divergence-between-client-and-server bugs. A board opening mid-lesson is immediately correct
with no replay. This is unchanged and load-bearing.

---

## 4. The Fleet core

### 4.1 What it owns

| Module | Responsibility |
|---|---|
| `fleet.ts` — `GroundStation` | The registry, Status derivation, ageing, publishing |
| `status.ts` | `deriveStatus`, `isStale` — the ageing rules |
| `charge.ts` | Return-to-Ready forecast from observed charge only (ADR-0007) |
| `history.ts` — `FleetHistoryRecorder` | Events derived from transitions; bounded retention |
| `simulator/` | `SimulatedTelemetrySource` and the classroom registry |

### 4.2 The properties that let it run in two runtimes

- **Time is injected.** `Clock` is a constructor dependency, never ambient. This exists
  because Stale and Offline were untestable otherwise; it is also exactly what a second
  runtime needs.
- **Randomness is injected.** The simulator takes `random()` so a run can be pinned.
- **No I/O.** Nothing reads a file, opens a socket, or asks the environment anything.
- **Publishes by comparison, not by timer.** `sameFleet` compares field by field so key
  ordering in Telemetry cannot masquerade as a change. In the browser this is what stops
  every tick becoming a React re-render — a property inherited for free, because it is the
  same class.

**Rule: a `node:` import in `fleet-core/` is a build failure in `web/`.** That is the check
working, not an inconvenience.

---

## 5. The simulator

Per ADR-0001 this ships permanently. It is not scaffolding.

### 5.1 What it models

Altitude chased toward a target rather than snapped, so climbing, hovering and descending are
three distinguishable things. Positional drift bounded by room walls. Per-motor thrust derived
from attitude, so leaning right really does make the left pair work harder. A rangefinder
measured against real geometry — walls and other Drones — so obstacle warnings come from an
aircraft approaching something rather than from a timer. Battery drain that differs flying
and idle, and charge that goes back in at a rate a real pack would manage. A latched
emergency stop that stays latched. Auto-landing an airframe may or may not support.

### 5.2 Capability variation is the point

Drones differ in whether they have a rangefinder, a camera, or auto-landing, assigned by
index so a demonstration always shows one of each. This is what keeps the board honest about
**absent versus null** — an airframe with no rangefinder and one that sees clear air must
never be drawn the same way, and that case would never appear in a demonstration if every
simulated Drone had every sensor.

### 5.3 What it must gain

- **`hold`** — set the target altitude to the current altitude. Backs the Hold Command; no
  equivalent exists today.
- **A commandable interface** — see §6.

### 5.4 Scenario triggers are not Commands

The simulator exposes two categorically different things, and requirement C9 forbids mixing
them:

| Commands — a Teacher asks an aircraft | Scenario triggers — the world misbehaves |
|---|---|
| `land`, `hold`, `beginAutoLanding`, `triggerEmergencyStop` | `injectFault`, `loseLink`, `setBattery`, `plugIn`, `takeOff`, `link` |

Only the left column reaches a Teacher's interface. The right column lives in a clearly
separated demonstration panel. Dressing a scenario trigger as a Command would teach an
interaction that cannot exist on real hardware.

---

## 6. Commands

The first messages that travel from board toward Fleet. Governed by ADR-0011.

### 6.1 Contract additions

```
type CommandKind = 'land' | 'hold' | 'auto-land' | 'emergency-stop'

interface DroneCommand {
  id        // client-generated, so an outcome can be matched to its request
  droneId
  kind
  issuedAt
}

// board → ground station. A separate union from ServerMessage, deliberately:
// the two directions must never be confused for one another.
type ClientMessage = { type: 'command'; command: DroneCommand }

// added to ServerMessage
{ type: 'command-outcome'; commandId; outcome: 'accepted' | 'refused'; reason: string | null }
```

### 6.2 The capability is a property of the source, not a setting

```
interface CommandableSource {
  command(command: DroneCommand): void
}

function isCommandable(source: TelemetrySource): source is TelemetrySource & CommandableSource
```

`TelemetrySource` itself gains **no** command method. `SimulatedTelemetrySource` implements
the second interface; a hardware source does not. A hardware adapter therefore cannot accept
a Command by forgetting to guard against one — only by someone deliberately implementing the
interface, which is a code review rather than a config change.

There is no flag, no environment variable and no setting that changes this. A flag is a thing
a person flips under time pressure to make a demonstration work.

### 6.3 An invariant worth stating

**Every Command reduces the aircraft's energy.** Land, hold, auto-land, stop. There is no
Command that makes a Drone do more than it is already doing, and `take-off` is deliberately
not one — a Teacher does not launch a Student's Drone from across the room.

This makes the whole command surface fail safe by construction: the worst outcome of a
mistaken Command is an aircraft that comes down when it did not need to.

### 6.4 Lifecycle — three separate facts

Requirement C4 forbids optimistic updates, and that needs three states rather than two.

| Fact | Known from | Shown as |
|---|---|---|
| 1. Issued | the board itself | "Land — sent" |
| 2. Accepted or refused | `command-outcome` from the Fleet core | "waiting for a response" / "This Fleet does not accept Commands" |
| 3. Observed | subsequent **Telemetry** | the Drone's phase changes. Only now does anything read as done |

Fact 2 means it reached the Fleet. Only fact 3 means the aircraft did anything. If Telemetry
shows no change, the strip says so — *"Land — sent, no response since"* — because a Command
that produced no change must look exactly like a Command that produced no change (C6).

### 6.5 Path

```
Local:   strip → FleetLink.send → LocalFleetLink → GroundStation.command()
                                  → isCommandable? → SimulatedTelemetrySource

Socket:  strip → FleetLink.send → SocketFleetLink → ws → server
                                  → GroundStation.command()
                                  → isCommandable? → source, or a refusal back
```

The board never addresses a Drone (C2). It asks the thing that owns the Fleet.

---

## 7. Frontend architecture

### 7.1 Layers

```
app/            Routes. Thin — compose one screen, set metadata. No logic.
components/     Screens, then sections, then primitives.
lib/            Pure logic and adapters. No JSX.
```

The rule that keeps this honest: **`lib/` never imports from `components/`**, and
**`components/` never imports the simulator**.

### 7.2 Routes

| Route | Screen |
|---|---|
| `/` | Fleet — the board. Default landing |
| `/control` | Flight Control Center |
| `/lesson` | Lesson Planner, and the "go to Control" card while running |
| `/students` | Students |
| `/reports` | Reports — lessons, reliability, timeline |
| `/settings` | Settings, including the demonstration panel |
| `/drone?id=` | One Drone in full |
| `/demo` | The board with a browser-simulated Fleet |
| `/showcase` | Outside the product. A design comparison |

`/drone` keeps `?id=` rather than a path segment: a static export must know every route at
build time, and the Fleet is whatever the ground station says it is.

`/tower` should redirect to `/control` rather than vanish — a Teacher may have bookmarked it.

### 7.3 Component structure

```
components/
  FleetProvider          the link, the clock, and the observers (§7.4)
  SiteHeader             identity · connection · simulation label · settings
  SiteNav                five destinations
  CommandPalette         navigation only. Never sends a Command

  FleetScreen            ── FleetSummary
                         ── DroneTile ── StatusBadge · BatteryLevel
                         ── WhatNeedsDoing        (from Maintenance)

  ControlScreen          ── LessonStrip           (only while running)
                         ── AttentionBar          one Alert, Acknowledge
                         ── Scope                 (was FormationMap)
                         ── FlightStrip ── ExerciseLine
                                        ── AlertLine ── AcknowledgeButton
                                        ── CommandRow ── CommandButton
                                                       ── Stop (single press)

  LessonScreen           ── ReadinessHeader · Blockers
                         ── AssignmentColumn ── StudentNameField
                         ── ExerciseList

  StudentsScreen         ── ClassList · TodayAssignments · StudentFlights
  ReportsScreen          ── LessonReport · FleetReliability · Timeline
  DroneScreen            ── FlightInstruments · BatteryChart · EventTimeline
  SettingsScreen         ── ScenarioPanel
```

Screens own layout and read stores. Sections are given data and hold only their own
interaction state. Primitives know nothing about the Fleet.

### 7.4 State management

Four stores, all read through `useSyncExternalStore`:

| Store | Holds | Backed by |
|---|---|---|
| `FleetLink` | `FleetSnapshot` | a socket, or the local Fleet core |
| `Logbook` | notes, service decisions, Lessons, Assignments, Students, Exercises, Commands | `localStorage` |
| `Theme` | light / dark | `localStorage` + media query |
| `DisplayScale` | type scale | `localStorage` |

Plus four **observers**, which are not stores — they accumulate what a single snapshot cannot
contain:

| Observer | Why it must exist |
|---|---|
| `AltitudeTracker` | Altitude becomes a rate only across snapshots. Samples stamped with the Drone's own Last Contact, so silence stops producing a rate rather than looking like levelling off |
| `AlertTracker` | When each condition began. Forgets a cleared condition so its return reads as new news |
| `AcknowledgementTracker` | Which Alerts the Teacher has taken. Same forget-on-clear rule (F7) |
| `CommandTracker` | Issued Commands and their outcomes, awaiting confirmation from Telemetry |

**These move from `ControlScreen` into `FleetProvider`.** Today `AltitudeTracker` and
`AlertTracker` are refs inside the Tower screen, which means navigating away and back resets
them — losing every vertical rate and every Alert start time mid-lesson. Held at the provider
they survive navigation within the app, which is the behaviour a Teacher already assumes.

**Acknowledgements are held in memory, not persisted.** An acknowledgement says *"I have seen
this and I am dealing with it"* — a statement about the current sitting. After a reload the
Teacher has lost their place, and re-seeing the queue is correct rather than annoying. It also
keeps ephemera out of the Logbook, which is already carrying too much (§8).

### 7.5 Derivation

`lib/vitals.ts` remains the single place any value is derived. Phase, vertical rate,
endurance, separation, Alerts, strip ordering. Two screens computing "is this one in trouble"
separately is how they end up disagreeing in front of a class.

It stays **pure**. Acknowledgement is applied when the queue is built, not inside derivation:

```
fleetVitals(input)                  → every Alert, whatever the Teacher has seen
alertQueue(vitals, acknowledged)    → what still needs them
```

Presentation lives in `lib/vitals-presentation.ts` and holds every user-facing word, so
nothing on the Control Center depends on a colour being seen.

### 7.6 Import boundaries — enforced, not hoped for

| Rule | Why |
|---|---|
| `web/components/**`, `web/app/**` ⇏ `fleet-core/simulator` | No simulation-specific logic in teacher-facing components |
| `web/components/**` ⇏ `fleet-core/*` | Screens read a `FleetSnapshot`, never the Fleet core |
| `fleet-core/**` ⇏ `node:*` | Keeps the core browser-capable |
| `lib/**` ⇏ `components/**` | Keeps logic testable without a DOM |

Exactly one module knows a Fleet is simulated: `FleetProvider`, which chooses the link and
publishes a single boolean for the header label. No screen branches on it.

---

## 8. Persistence, and the decision requirement H6 asked for

Everything a Teacher authors lives in one browser's `localStorage`, because the board holds no
server and the only thing it now sends is a Command. The redesign adds Exercises, plans,
Students and Command records to what was already notes, service decisions and Lessons.

**Decision: stay on `localStorage` for this work, with three mitigations, and record a
file-backed record as a separate future decision.**

1. Export becomes prominent, and closing a Lesson offers it.
2. A stored-size check warns the Teacher before a quota failure, rather than after.
3. Storage failure already degrades to in-memory for the session and says so. That holds.

Rejected for now: writing records through the ground station. It is the right eventual answer
and it is a **second write path** — with its own authority, conflict and multi-Teacher
questions — and opening it in the same phase as the Command path would mean two new
directions of travel at once. It needs its own ADR.

---

## 9. Future hardware integration

The whole point of the arrangement. When aircraft exist:

1. Write one class in **`ground-station/`** — `RadioTelemetrySource implements TelemetrySource`.
   It belongs there, not in `fleet-core/`, because it is Node-bound: it holds a serial port or
   a socket. `fleet-core/` stays pure by construction rather than by discipline.
2. **Do not implement `CommandableSource`.** ADR-0011 means a hardware Fleet refuses Commands
   until a successor ADR says otherwise, and the refusal is structural.
3. Select it in `main.ts`.

What changes: one new file, one line choosing it.
What does not change: `contract/`, `fleet-core/`, every component, every screen, every test in
`web/`.

Gated on `docs/questions-for-drone-team.md`, which still has an open Tier 0 question. The
observation shape a hardware source must produce is already specified by `Telemetry`, and its
absent-versus-null rule is the part most likely to be got wrong: **a value the airframe cannot
report is `undefined`; a value it can report and has nothing to say about is `null`.** A source
that sends `0` for a missing sensor breaks the product's central honesty guarantee.

---

## 10. Testing

Vitest projects after ADR-0010 and ADR-0013:

| Project | Environment | Covers |
|---|---|---|
| `contract` | node | Type-level guarantees and helpers |
| `fleet-core` | node | Status, ageing, charge, history, the simulator |
| `ground-station` | node | The server and transport |
| `web` | jsdom | Screens, `lib/`, the links |

`dashboard` retires. Its 35 `FleetBoard` tests have identically-named counterparts in `web`
already; its 14 connection tests are ported and extended per
[`FLEET_CONNECTION_TEST_MIGRATION.md`](./FLEET_CONNECTION_TEST_MIGRATION.md).

New coverage this architecture requires:

- **`LocalFleetLink` and `SocketFleetLink` produce the same snapshot shape** from the same
  Fleet. This is the assertion that lets every screen stay ignorant of which one it has.
- **A non-commandable source refuses**, and the refusal reaches the board as an outcome
  rather than as silence.
- **Nothing is optimistic** — a Command with no Telemetry effect never reads as done.
- **Acknowledgement**: leaves the queue, returns on worsening, forgets on clear.
- **Screens after the Fleet board**, which currently have none at all (audit F4).

Time is driven by `TestClock` throughout. Reconnection and ageing are time-driven and must
never be tested by sleeping.

---

## 11. Build, deploy, and cost

| Target | Seam 2 | Built by |
|---|---|---|
| Vercel | Local | `NEXT_PUBLIC_DEMO_ONLY=1`, static export, `web/out` |
| A school | Socket | `ground station serves web/out` — the audit F2 fix |

The board still exports statically and still needs no server. ADR-0005 is untouched.

**Cost.** `fleet-core` enters the `web` bundle: pure TypeScript, no dependencies, and only on
routes that use it. The browser simulation is one interval, six to eight objects, and a
separation calculation that is quadratic over eight — sixty-four operations a second. There is
no workload here.

`sameFleet` means the snapshot's identity changes only when the Fleet actually changed, so
React re-renders on change rather than on tick. Ages still update every second through a
separate clock reading, which is deliberate and is the only per-second re-render.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| A `node:` import creeps into `fleet-core` | It fails the `web` build. Rule 1 of ADR-0013 is load-bearing |
| The two runtimes drift apart | There is only one Fleet core. If they ever produce different Fleet States from the same inputs, the core has acquired an ambient dependency and the fix is to inject it, not to fork |
| A component reaches for the simulator | Import boundary, §7.6 |
| The Command path grows toward hardware by accident | `isCommandable` is the only route, and no hardware source implements it. ADR-0011 requires a successor ADR, not an edit |
| A scenario trigger appears beside a Command | C9. They live in different screens |
| Moving `fleet-core` breaks the ground station | It is a file move; the tests move with it and must pass unchanged before anything else proceeds |

## 13. For Phase 5

The sequence is not obvious and the dependencies are real. Two things gate almost everything:
the connection tests (they gate ADR-0010's deletion) and the `fleet-core` extraction (it gates
the browser simulation, which gates being able to *see* the Control Center work). Neither is
glamorous, and putting them first is the difference between a plan and a wish.
