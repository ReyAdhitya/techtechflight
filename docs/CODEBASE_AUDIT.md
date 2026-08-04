# Codebase audit

**Date:** 2026-07-22 · **Branch:** `fleet-status-board` @ `d1b3c9f` · **Working tree:** clean

Phase 1 of the Flight Traffic Control redesign. This is a survey of what exists, written
before any requirement is defined and before any code is changed. Nothing here proposes
work — findings are recorded with evidence so that Phases 2–5 argue from facts.

## Method

What was actually done, so the confidence level of each claim is legible:

- Read in full: `contract/src/index.ts`, `ground-station/src/{main,fleet,server,simulator/*}.ts`,
  `web/lib/{vitals,logbook,fleet-connection,vitals-presentation,scenarios}.ts`,
  `web/components/{FleetProvider,TowerScreen,LessonScreen,SettingsScreen,SiteNav}.tsx`,
  `CONTEXT.md`, every ADR title, all build config.
- Skimmed (headline comments + signatures): the remaining 40 components in `web/`, all of
  `dashboard/src/`.
- Ran: `npm test` → **223 passed / 223**, `npm run typecheck` → **clean**.

Claims below are marked *verified* (I ran it or read it), or *inferred* (reasoned from
what I read, not directly executed).

---

## 1. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Language | TypeScript 5.7, ESM throughout | `exactOptionalPropertyTypes: true` — optional props need explicit `\| undefined` |
| Monorepo | npm workspaces — `contract`, `ground-station`, `dashboard`, `web` | No Turborepo/Nx; root scripts orchestrate |
| Ground station | Node + `tsx`, `ws` for WebSocket | Long-lived process, runs on a Teacher's laptop |
| Product board | Next.js 16 (App Router) + React 19 + Tailwind v4 | `output: 'export'` — static, no server (ADR-0005) |
| Legacy board | Vite 7 + React 19 + hand-written CSS | See finding **F1** |
| Testing | Vitest 3 with `projects`, jsdom + Testing Library | 4 projects: ground-station, contract, dashboard, web |
| Deploy | Vercel static export of `web/out` | `vercel.json`; `NEXT_PUBLIC_DEMO_ONLY=1` at build |
| 3D / motion | `three`, `@react-three/fiber`, `framer-motion` | Used **only** by `/showcase`, not by the product |

No chart library, no state library, no data-fetching library. Charts are hand-rolled SVG
(ADR-0002 — the ground station must work offline in a school with no internet). State is
`useSyncExternalStore` over three plain stores: the socket, the logbook, the theme.

## 2. Folder structure

```
contract/          561 LOC   The only thing the two programs share (ADR-0003)
  src/index.ts               Domain types, thresholds, message envelopes
  src/testing.ts             SystemClock, TestClock
  src/fixtures.ts            aDroneState / aTelemetry builders

ground-station/  2,401 LOC   Owns the Fleet. Node process, no UI.
  src/fleet.ts               GroundStation: registry, Status derivation, publish
  src/status.ts              deriveStatus / isStale — the ageing rules
  src/charge.ts              Charge forecast from observed samples only (ADR-0007)
  src/history.ts             FleetHistoryRecorder: events + battery samples, bounded
  src/server.ts              HTTP static + one WebSocket at /fleet
  src/simulator/             SimulatedTelemetrySource — a real physics-ish simulator

dashboard/       2,673 LOC   The ORIGINAL board. Vite. See F1 — superseded.

web/             9,900 LOC   The product board. Next.js static export.
  app/(app)/                 7 routes behind one FleetProvider
  app/showcase/              A design comparison surface, outside the product
  components/                43 components
  lib/                       vitals, logbook, fleet-connection, presentation helpers

docs/adr/                    9 ADRs — the authoritative "why"
CONTEXT.md                   The domain glossary — authoritative vocabulary
```

### Documentation that is *not* product documentation

The instruction is to treat documentation as the source of truth, so it matters which
documents are which. Authoritative: **`CONTEXT.md`**, **`docs/adr/*`**, **`README.md`**.

Not authoritative, and easy to mistake for it:

- ~~`MISSION.md`, `NOTES.md`, `RESOURCES.md`, `lessons/`, `learning-records/`,
  `reference/`~~ — a personal UI-design coaching track that *used* this repo as its
  subject. It described the author's learning goals, not the product's requirements.
  **Removed from the repository on 2026-07-27**, before it went public, for exactly the
  reason this entry gives: it was never about the product. The six deliberate positions
  `NOTES.md` carried were product content and survive in
  `docs/DELIBERATE-POSITIONS.md`.
- `design.md` — the design system for **a different product** ("Proposal Console"). ADR-0009
  adopts its palette for this board; the rest of the file is about another application.

Recommendation for later phases: leave them alone, but never cite them as requirements.

## 3. Data flow, end to end

*Verified by reading each hop.*

```
SimulatedTelemetrySource            (ground-station/src/simulator/)
  │  emits TelemetryObservation every 1,000 ms, per Drone
  │  a Drone with linkUp=false emits NOTHING — silence is absence, never a message
  ▼
GroundStation                       (ground-station/src/fleet.ts)
  │  stamps lastContact, records a charge sample
  │  derives Status: Offline | Ready | Not Ready | Flying | Fault
  │  ages Telemetry → stale → Offline on a 1 s tick (silence is not an event)
  │  publishes only when the Fleet actually changed (sameFleet, field-by-field)
  ▼
FleetHistoryRecorder                (ground-station/src/history.ts)
  │  derives FleetEvents from transitions — ids derived, so replay is idempotent
  ▼
startFleetServer                    (ground-station/src/server.ts)
  │  ws://…:4321/fleet — on connect: fleet-state, then fleet-history; then streams
  ▼
FleetConnection                     (web/lib/fleet-connection.ts)
  │  reconnects with backoff forever; retains last state across the gap
  │  merges streamed events into held history by id
  ▼
FleetProvider                       (web/components/FleetProvider.tsx)
  │  ONE socket for all screens, held at the (app) layout
  │  + useNow(1 s) so ages keep counting between snapshots
  ▼
fleetVitals()                       (web/lib/vitals.ts)   ← every derivation, one place
  │  phase, vertical rate, endurance, separation, alerts
  ▼
TowerScreen / FleetBoard / DroneScreen / LessonScreen / …
```

Two client-side stores sit alongside, both bounded and both held in refs on `TowerScreen`:
`AltitudeTracker` (a 10 s ring of altitude readings per Drone, stamped with the Drone's own
Last Contact so silence stops producing a rate rather than looking like levelling off) and
`AlertTracker` (when each condition was first observed; a condition that clears forgets its
start time so its return reads as new news).

A third store, the **Logbook** (`web/lib/logbook.ts`), holds everything the Teacher writes:
notes, service decisions, lesson records, and pilot assignments. It is `localStorage` only.

### The direction of the arrows

There is **no return path**. `contract/src/index.ts:368` states it as a rule: *"there is
deliberately no message in the other direction, and a demonstration affordance must not
become one."* `ground-station/src/main.ts:98` honours it — the demo scenario triggers are
bound to the ground station's own **stdin**, specifically so they cannot become a command
channel. `CommandPalette.tsx:22` repeats the reasoning for the same reason.

This is the single most important fact in the audit for the redesign. See **F3**.

## 4. Routes and screens

All under `web/app/(app)/`, sharing one layout, one socket, one command palette.

| Route | Screen | Answers |
|---|---|---|
| `/` | `FleetScreen` → `FleetBoard` | "Which Drones can I hand out?" — tiles in fixed board order |
| `/demo` | same components | The board with fixtures instead of a socket |
| `/tower` | `TowerScreen` | "Who needs me next?" — alert bar, radar scope, flight strips |
| `/lesson` | `LessonScreen` | Pre-flight check → running lesson → summary |
| `/history` | `HistoryScreen` | "When did we lose it? Did it do that again?" |
| `/maintenance` | `MaintenanceScreen` | "What needs doing, and which Drone keeps needing it?" |
| `/drone?id=…` | `DroneScreen` | One Drone in full — live readings + its own history |
| `/settings` | `SettingsScreen` | Connection facts, export/import/clear records |
| `/showcase` | outside `(app)` | A maximalist design comparison. Not the product. |

`/drone` uses `?id=` rather than a path segment deliberately: a static export must know
every route at build time, and the Fleet is whatever the ground station says it is.

## 5. Current features

**Fleet awareness** — tiles in stable board order that never reorder on Status change
(muscle memory, ADR-0004); Needs Attention grouping; per-value ages; Stale marking; a
search/filter that appears only past 9 Drones; command palette (`Ctrl`/`⌘`+K).

**Oversight (the existing ATC layer)** — `web/lib/vitals.ts` already derives, with 44
tests: 8 flight phases, vertical rate with a deadband, endurance projected from observed
discharge, pairwise separation among airborne Drones only, and 8 alert kinds across 3
severities with stable start times and a worst-first queue.

**Lesson workflow** — pre-flight readiness count with blockers listed in actionable order;
a running lesson with elapsed time and live figures; incidents written into the record as
the lesson closes (because the ground station's history is bounded and will age them out);
per-Drone tallies persisted the same way.

**Maintenance** — this-morning actions plus a reliability ranking across the retained
window, merging live events with saved lesson tallies and de-duplicating by time window.

**Records** — notes, in-service/watch/out-of-service decisions, lesson history, pilot
assignment per Drone; JSON export and import.

**Presentation discipline** — colour is never the sole carrier of meaning (ADR-0004): every
Status and severity carries a word and a shape. Absent vs null is preserved end to end: an
airframe with no rangefinder and one that sees clear air are never drawn the same way.

**Simulation** — `SimulatedTelemetrySource` (487 LOC, 20 tests) models altitude chasing a
target, positional drift bounded by room walls, attitude-derived per-motor thrust, a
rangefinder measured against real geometry, charge going in and out, latched emergency
stop, auto-landing, camera, link groups, and spontaneous events. Per ADR-0001 it ships
permanently rather than being scaffolding.

---

## 6. Findings

Ordered by consequence for the stated goal. Each carries its evidence.

### F1 — Two board implementations exist; one is dead and still owns 22% of the test suite
**Severity: high** · *Verified*

`dashboard/` (Vite, 2,673 LOC) and `web/` (Next.js, 9,900 LOC) are both live workspaces.
These modules exist in both, independently maintained: `age`, `battery`, `theme`,
`display-scale`, `status-presentation`, `fleet-connection`, `StatusBadge`, `DroneTile`,
`FleetSummary`, `ConnectionBanner`, `DroneDetailDialog`, `DisplayScaleToggle`,
`ThemeToggle`, `SiteHeader`, `FleetBoard` — and `FleetBoard.test.tsx` twice (474 and 576
lines). `dashboard`'s 49 tests are 22% of the 223 that pass.

`vitest.config.ts` says why: *"There are two boards while the Next.js one is being brought
up to the Vite one."* That migration is finished — `web/` has Tower, Lesson, History,
Maintenance, Settings and the whole vitals engine; `dashboard/` has none of them and never
will. The comment describes a state that no longer exists.

### F2 — The real ground station serves the **old** board
**Severity: critical** · *Verified by reading; not executed*

`ground-station/src/main.ts:14` — `const dashboardDist = resolve(here, '../../dashboard/dist')`
— and line 86 passes it to the server as `dashboardDir`. ADR-0005 anticipated the move
(*"it can serve `web/out` exactly as it serves `dashboard/dist` today"*) but nothing ever
changed the path.

Consequence: a School running the actual product gets the Vite board — **no Tower, no
Lesson, no History, no Maintenance, no vitals**. Every screen built in the last stretch of
work is reachable only from the Vercel demo, which by design has no ground station behind
it. The ATC system does not currently exist on the deployment path that matters.

### F3 — "Flight **Control**" implies a command path the architecture forbids
**Severity: blocking for Phase 2** · *Verified*

The goal statement asks for a "Flight Control Center" where "the teacher should feel like a
flight operator **controlling** a classroom fleet". The system is read-only by explicit,
documented, thrice-defended decision (§3 above).

Overseeing and controlling are different products. Adding a command path — especially for
emergency stop and auto-landing, on real aircraft, in a room with children — is a safety
and architecture decision that belongs to you and the drone team, not to an implementation
pass. The command-protocol questions in `docs/adr/0022-…` cover exactly this.

Phase 2 cannot be written without an answer. Three coherent options exist, and they produce
genuinely different requirements documents:

1. **Oversight only** (status quo). The controller metaphor covers attention, triage and
   record-keeping. Nothing is ever commanded. Safest; honest; already 80% built.
2. **Simulated command only.** Commands act on `SimulatedTelemetrySource` and are refused
   when the Telemetry Source is real hardware. Teaches the interaction; risks nothing.
3. **Real command path.** A second message direction, an authority model, confirmation
   semantics, and a spec conversation with the drone team first.

### F4 — Every screen added after the Fleet board is untested
**Severity: high** · *Verified*

`web/` test files: `vercel-routing`, `vitals` (44), `logbook` (11), `FleetBoard` (43),
`DemoBoard` (1). There are **zero** tests for `TowerScreen`, `LessonScreen`,
`MaintenanceScreen`, `HistoryScreen`, `DroneScreen`, `SettingsScreen`, `FormationMap`,
`FlightInstruments` or `CommandPalette`.

The derivation engine is well covered; the layer that presents it is not covered at all.
This is precisely the seam that recent work has repeatedly broken — an earlier defect where
alert start times were silently constant typechecked and had passing unit tests while being
dead in the UI.

### F5 — The deployed demo cannot animate, so it cannot show the vitals it computes
**Severity: high** · *Verified*

`web/lib/scenarios.ts:66+` returns six hard-coded `DroneState`s. Altitude, position and
attitude are literals; the `at` argument only restamps `lastContact`. `FleetProvider`
re-anchors every 2 s (`DEMO_REFRESH_MS`), which refreshes the ages and nothing else.

Therefore, on the only build anyone can look at without running a Node process:
`AltitudeTracker` sees a constant altitude → vertical rate is always 0 → the `climbing`
and `descending` phases are **unreachable**; separation never changes; the radar scope is
a still frame; endurance never resolves because charge never moves.

Meanwhile a genuinely good simulator (§5) sits in `ground-station/` where the deployment
cannot reach it. The brief says to use simulated drone data — we have excellent simulated
data and the shop window is showing a photograph of it.

### F6 — Teacher records are browser-local, and the goal adds more of them
**Severity: medium — a constraint to decide about, not a defect** · *Verified*

`web/lib/logbook.ts` keeps notes, service decisions, lessons and pilots in `localStorage`.
This is documented honestly in the module header and surfaced to the Teacher in Settings.
It follows correctly from the read-only rule: there is nowhere else to put it.

But the final goal adds **student assignment** and **flight reports** — both of which are
Teacher-authored records. Building them on `localStorage` means a Teacher's whole term of
records dies with a cleared cache or a different laptop. That is a trade-off worth stating
in the requirements rather than discovering after it is built.

### F7 — `next/link` prefetch is dead under `output: 'export'`
**Severity: medium** · *Inferred from prior verification, not re-run this pass*

Every nav link requests an RSC payload that does not exist in a static export; each 404s
and aborts. No correctness impact — clicks work — but every navigation pays full latency
and the console is noisy on a projector in front of a class.

### F8 — `/showcase` ships three.js into the product's dependency tree
**Severity: low** · *Verified*

`/showcase` is ~1,500 LOC plus a 908-line stylesheet, and is the sole consumer of `three`,
`@react-three/fiber`, `@react-three/drei` and `framer-motion` in `web/package.json`. Its
own layout comment calls it *"a comparison rather than part of the product."* Route-level
code splitting keeps it out of the product bundle, but it is in every install and build.

Worth a decision, not urgent. It has value as a design argument — deleting it loses that.

---

## 7. Gap analysis against the stated final goal

| Goal | State today | Gap |
|---|---|---|
| Flight Control Center | `/tower` exists: alert queue, radar scope, flight strips | Partly built. "Control" unresolved — **F3** |
| Drone fleet monitoring | `/` board, stable order, Needs Attention | Substantially complete |
| Live telemetry | Full pipeline, 1 s cadence, ages everywhere | Complete against the simulator — but see **F5** |
| Drone vitals | `vitals.ts`: phase, rate, endurance, separation, 8 alert kinds | Substantially complete, 44 tests |
| Alerts | Derived, severity-ranked, stable start times, queued worst-first | Present. **Not acknowledgeable** — a controller works a queue *down*; this one only reports |
| Mission planner | Nothing | Absent entirely. Also the least defined — needs requirements before design |
| Student assignment | `pilots` on the Logbook; inline field on each flight strip | Minimal version exists; no roster, no history, no per-Student view |
| Flight reports | Lesson records with incidents + per-Drone tallies | Data exists; no report artifact, no print view, no export beyond raw JSON |

## 8. Problems worth naming that are not on the list above

- **`sameFleet` compares `telemetry` by reference** (`fleet.ts:182`). Correct today because
  the simulator emits a fresh object per tick — but a Telemetry Source that mutates and
  re-emits one object would silently stop publishing. A real hardware adapter is exactly
  the kind of code that would do that. *Inferred; worth a comment or a test, not a fix now.*
- **Thresholds live only on the ground station** and are read-only in Settings. Deliberate,
  documented, and correct — noted so nobody "fixes" it later.
- **No first-run state.** A Teacher opening the board with no ground station and no records
  sees "Waiting for the first Fleet State" and nothing that teaches them what to do.
- **The command-protocol questions are still open** (recorded in `docs/adr/0022-…`). Any
  requirement that depends on real hardware behaviour should cite them rather than assume
  an answer.

## 9. What I need from you before Phase 2

1. **F3 — which of the three options?** This determines whether the product is an oversight
   console or a control console, and I cannot write requirements without it.
2. **F2 — should the ground station serve `web/out`?** This looks like a two-line fix and a
   build script, but it retires the Vite board in practice, which touches F1.
3. **F1 — retire `dashboard/`?** My read is yes, in its own commit, with the reasoning
   recorded as an ADR. Flagging rather than assuming, per "never remove existing features
   without justification" — the justification exists, but the call is yours.
4. **Mission planner — what is it?** It is the one item in the final goal with no existing
   code, no ADR, and no glossary entry. Before Phase 3 draws it, Phase 2 has to say what a
   Teacher is planning: a sequence of exercises? An assignment of Students to Drones to
   time slots? A flight area with boundaries? These are three different products.

Nothing in Phases 2–7 should start until 1 and 4 are answered. Items 2 and 3 can be settled
later, but before any implementation.

---

## Appendix A — `dashboard/` → `web/` migration parity audit

Requested before any deletion, so that retiring the Vite board is justified by evidence
rather than by assertion. Steps 1 and 2 of the agreed five; steps 3–5 (deployment config,
ADR, removal) are implementation and belong to Phase 6.

### A.1 Method

Compared every module that exists in both workspaces by `diff`, compared both test suites
by extracting every `describe`/`it` name, and read both `FleetBoard` implementations and
the `dashboard` shell in full.

### A.2 Module-level comparison

| Module | Verdict |
|---|---|
| `age.ts` | **Byte-identical.** No divergence. |
| `status-presentation.ts` | **Byte-identical.** No divergence. |
| `battery.ts`, `theme.ts`, `display-scale.ts` | Differ — `web/` versions have evolved. Nothing in the `dashboard/` versions is absent from `web/`. |
| `fleet-connection.ts` | `web/` is a **strict superset**: identical reconnection, backoff, retention and malformed-frame handling, plus `fleet-history` and `fleet-events` handling with id-keyed merging. |
| `FleetBoard.tsx` | `dashboard/` is a **strict subset**: no search, no filter lens, no demo labelling, no empty-Fleet state. |
| `DroneTile`, `DroneDetailDialog`, `FleetSummary`, `ConnectionBanner`, `BatteryLevel`, `StatusBadge`, `SiteHeader`, `ThemeToggle`, `DisplayScaleToggle` | Present in both; every `web/` version is larger and none drops a behaviour. |
| `board.css` + `tokens.css` (916 lines, hand-written) | Replaced by Tailwind v4 + `app/globals.css`. A different technique for the same result, not a lost feature. |

### A.3 Test-suite comparison — the decisive evidence

**`FleetBoard.test.tsx`: all 35 `dashboard/` tests have an identically-named counterpart in
`web/`.** Not merely equivalent coverage — the same test names, one for one. `web/` adds 8
beyond them: Offline drones counted without becoming an alert, three Stale-qualifier cases,
demo labelling, and three empty-Fleet cases.

**`fleet-connection.test.ts`: 14 tests in `dashboard/`, and `web/` has none.** `web/lib/`
contains only `vitals.test.ts`, `logbook.test.ts` and `vercel-routing.test.ts`.

### A.4 Conclusion — one blocker, and it is not what it looked like

`web/` replaces **all** `dashboard/` user-facing functionality. Feature parity is complete
and evidenced: no screen, no state, no accessibility affordance and no behaviour exists in
`dashboard/` that `web/` does not also provide, usually in a more developed form.

The blocker is coverage, not features. Deleting `dashboard/` today would delete the only
tests that guarantee the board reconnects by itself — backoff growth, the hold at the
longest delay, the reset on reconnect, retention of the last Fleet across the gap, and the
refusal to blank on a malformed frame. `web/lib/fleet-connection.ts` needs every one of
those *and* has two behaviours the `dashboard/` version never had (history capture, id-keyed
event merging across a reconnect) which are currently tested nowhere at all.

That last point is worth stating plainly: the de-duplication that stops a Teacher seeing
this morning's fault twice after the socket blinks is untested in the shipping board.

**Revised sequence for Phase 6:**

1. Port `fleet-connection.test.ts` to `web/lib/`, adapted to the superset API.
2. Add the missing cases for `fleet-history` and `fleet-events` merging — new coverage, not
   a port. This closes a real gap regardless of what happens to `dashboard/`.
3. Point `ground-station/src/main.ts` at `web/out`; rename `dashboardDir` to match.
4. Write the ADR recording the migration and this parity evidence.
5. Remove `dashboard/` — its workspace entry, its Vitest project, and its dependencies.

Steps 1 and 2 stand on their own merit and should land first even if the rest is deferred.
