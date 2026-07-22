# Implementation plan

Phase 5. Work broken into tasks that can each be done, verified and committed on their own,
in the order given: foundations before interface.

Phase 6 executes it. Live progress is in the table below.

Sources: [`REQUIREMENTS.md`](./REQUIREMENTS.md) · [`DESIGN.md`](./DESIGN.md) ·
[`ARCHITECTURE.md`](./ARCHITECTURE.md) · ADRs
[0010](./adr/0010-retire-the-vite-dashboard.md)–[0013](./adr/0013-the-fleet-core-runs-in-the-browser-too.md) ·
[`FLEET_CONNECTION_TEST_MIGRATION.md`](./FLEET_CONNECTION_TEST_MIGRATION.md)

---

## Definition of done — applies to every task

A task is not finished until all of these are true. No task is exempt.

1. `npm test` passes in full — never only the tests for the thing just changed.
2. `npm run typecheck` passes for both projects.
3. `npm run build --workspace=web` completes.
4. No test was deleted or weakened to make a change pass. If a test now describes wrong
   behaviour, that is a finding to report, not a licence to edit it.
5. Nothing marked **Exists** in `REQUIREMENTS.md` regressed.
6. The commit message says what changed and why, in the repository's voice.

Verification beyond the suite, where a task calls for it:

- **Device audit** — 8 iOS/Android/tablet profiles, tap targets hit-tested rather than read
  off the CSS.
- **Desktop audit** — 3 widths.
- **Live check** — the page loaded in a real browser. A runtime error white-screens a page
  that still returns HTTP 200, so an HTTP check proves nothing.

---

## Progress

Updated as part of each task's own commit, so it cannot drift from what happened.

| Stage | Task | Status | Commit |
|---|---|---|---|
| 1 | 1.1 Create the `fleet-core` workspace | ✅ | `0342412` |
| 1 | 1.2 Move the pure modules | ✅ | `13b41c2` |
| 1 | 1.3 Forbid Node APIs in `fleet-core` | ✅ | `94c0d9e` |
| 1 | 1.4 Point the ground station at `web/out` | ✅ | `b60db43` |
| 2 | 2.1 Port the 14 connection tests | ✅ | `ff5d006` |
| 2 | 2.2 Fix the accidental assertion | ✅ | `d0c2630` |
| 2 | 2.3 Cover history and event merging | ✅ | `95ea86d` |
| 2 | 2.4 Retire `dashboard/` | ✅ | `abe5617` |
| 3 | 3.1 Introduce `FleetLink` | ✅ | `f4d2fc6` |
| 3 | 3.2 Build `LocalFleetLink` | ✅ | `a230195` |
| 3 | 3.3 Equivalence between the links | ✅ | `4ddb5a7` |
| 3 | 3.4 Choose the link, retire the fixtures | ✅ | `43de7a5` |
| 3 | 3.5 Lift the observers into the provider | ✅ | `894d438` |
| 3 | 3.6 Enforce the import boundary | ✅ | `847ff59` |
| 4 | 4.1 Rename the route and the screen | ✅ | `32c1aab` |
| 4 | 4.2 One Alert at a time | ✅ | `5b8317f` |
| 4 | 4.3 Acknowledgement | ✅ | `7e9b863` |
| 4 | 4.4 The scope | ✅ | `0f32b68` |
| 4 | 4.5 Student wording | ✅ | `31c9ec4` |
| 4 | 4.6 Running Lesson into Control | ✅ | `eda600c` |
| 5 | 5.1 Contract: commands and the seam | ✅ | `7170692` |
| 5 | 5.2 Simulator accepts commands | ✅ | `bc197be` |
| 5 | 5.3 Fleet core routes or refuses | ✅ | `f82a618` |
| 5 | 5.4 Both links can send | ✅ | `9587b28` |
| 5 | 5.5 Commands on the strip | ✅ | `1ab1353` |
| 5 | 5.6 Scenario panel, separated | ✅ | `pending` |
| 5 | 5.7 The simulation label | ✅ | `2f05910` |
| 6 | 6.1 Logbook grows | ✅ | `pending` |
| 6 | 6.2 Assignment column | ✅ | `pending` |
| 6 | 6.3 Exercise list | ✅ | `pending` |
| 6 | 6.4 Starting with no plan at all | ✅ | `pending` |
| 6 | 6.5 Exercise on the flight strip | ✅ | `pending` |
| 6 | 6.6 Students screen | ✅ | `pending` |
| 7 | 7.1 The Reports shell | ✅ | `pending` |
| 7 | 7.2 "What needs doing" moves to Fleet | ✅ | `pending` |
| 7 | 7.3 Navigation reduces to five | ✅ | `pending` |
| 7 | 7.4 The Lesson report | ✅ | `pending` |
| 7 | 7.5 Printing | ✅ | `pending` |
| 8 | 8.1 Motion | ✅ | `pending` |
| 8 | 8.2 States sweep | ⬜ | |
| 8 | 8.3 Device and desktop audits | ⬜ | |
| 8 | 8.4 Records weight | ⬜ | |
| 8 | 8.5 Boundary and dead-prefetch check | ⬜ | |
| 8 | 8.6 Final verification | ⬜ | |

Findings from tasks already done are logged in [`TEST_REPORT.md`](./TEST_REPORT.md).

---

## Dependency graph

```
Stage 1  Fleet core extraction
   │
   ├──────────────► Stage 3  Browser simulation runtime
   │                   │
Stage 2  Connection     ├──► Stage 4  Flight Control Center
         tests          │        │
   │                    │        ├──► Stage 5  Simulated commands
   └── retire dashboard │        │        │
                        │        │        └──┐
                        │        └───────────┼──► Stage 6  Lesson Planner
                        │                    │            + Students
                        └────────────────────┴──► Stage 7  Reports
                                                       │
                                                  Stage 8  Polish
```

Stages 1 and 2 are independent of one another and could run in either order. Stage 1 comes
first as instructed, and it is the right call: it is the larger change, and doing it while the
tree is otherwise quiet is worth more than the parallelism.

**Two tasks not in the eight stages have to land somewhere**, and both belong to Stage 2:
pointing the ground station at `web/out` (audit F2) and deleting `dashboard/` (ADR-0010).
They are placed there because the connection tests are what make the deletion safe.

**Student Operations is not one of the eight stages.** It shares the class list, the
Assignment record and the Logbook shape with the Lesson Planner, so it is folded into Stage 6
rather than given a stage of its own. Flagged because it was a named area in `DESIGN.md`.

---

## Stage 1 — Fleet core extraction

Moves Status derivation, ageing, the charge forecast, history and the simulator into a
workspace with no Node dependencies. Verified precondition: Node APIs exist in exactly two
files, `main.ts` and `server.ts`. This is a move, not a port.

### 1.1 Create the `fleet-core` workspace

- **Objective:** An empty, wired-up workspace that builds and runs no tests yet.
- **Files:** `fleet-core/package.json`, `fleet-core/tsconfig.json`, `package.json`
  (workspaces), `tsconfig.base.json` / path mapping, `vitest.config.ts` (new project).
- **Depends on:** nothing.
- **Testing:** Suite still passes at 223. `npm run typecheck` clean. The new project reports
  zero tests rather than failing to resolve.
- **Commit:** `Add the fleet-core workspace, empty for now`

### 1.2 Move the pure modules

- **Objective:** `status.ts`, `charge.ts`, `fleet.ts`, `history.ts`, **`testing.ts`** and
  `simulator/` move to `fleet-core/src/`, with their tests, unchanged.
- **Corrected after doing it:** this plan said five modules; it is **seven**.
  `testing.ts` holds `FakeTelemetrySource`, which both a moved test and the ground
  station's own test need, so it moved and is published on a `/testing` subpath the way
  `contract` already publishes its own. Leaving it behind would have made `fleet-core`
  import upward from the ground station.
- **Files:** the five modules and `fleet.test.ts`, `history.test.ts`,
  `simulator/simulated-telemetry-source.test.ts`; `ground-station/src/main.ts` and
  `server.ts` updated to import `@techtechflight/fleet-core`; `ground-station/package.json`
  gains the dependency.
- **Depends on:** 1.1.
- **Why one commit:** these modules import each other. Moving them separately leaves the tree
  unbuildable between commits, which is worse than a large diff — and `git` records it as
  renames, so the diff reads as a move.
- **Testing:** **The moved tests must pass unchanged.** Not adapted, not adjusted — a move
  that needs its tests edited is not a move. Suite stays at 223, redistributed across
  projects. Start the ground station and confirm it still serves and still streams.
- **Commit:** `Move the Fleet core out of the ground station`

### 1.3 Forbid Node APIs in `fleet-core`

- **Objective:** A `node:` import in the core fails the build rather than being discovered in
  the browser.
- **Files:** `fleet-core/tsconfig.json` (`types: []`, `lib: ES2022` only) **and the root
  `typecheck` script**, which has to invoke it.
- **Corrected after doing it:** a lint rule is not enough and neither is `types: []` on
  its own. `@types/node` arrives *transitively* through `vitest`'s declarations, so the
  first version of this guard passed with a `node:fs` import sitting in the core. The
  strict config covers production sources only; test files are checked by the root
  project.
- **Depends on:** 1.2.
- **Testing:** Add `import 'node:fs'` to a core file temporarily and confirm the build fails.
  Remove it. A guard nobody has seen fail is not a guard.
- **Commit:** `Keep the Fleet core free of Node`

### 1.4 Point the ground station at `web/out`

- **Objective:** Audit finding **F2** — a School currently gets the old board.
- **Files:** `ground-station/src/main.ts` (path), `ground-station/src/server.ts`
  (`dashboardDir` → `boardDir`, **and `resolveFile`**), `server.test.ts` (5 new tests).
- **Corrected after doing it:** this is **not** the two-line path change the plan assumed.
  A static export names a screen `tower.html` and puts a `tower` directory beside it with
  no index, so `resolveFile` found the directory, found nothing in it, and returned 404
  for every screen but the home page. Verified against a running server before the fix:
  `/` answered 200 and `/tower` answered 404.
- **Depends on:** 1.2. Placed here rather than Stage 2 because it touches the files Stage 1
  already has open, and it is the highest-severity finding in the audit.
- **Testing:** Build `web`, run the ground station, load the board it serves in a real
  browser, confirm Control/Lesson/History/Maintenance are present — they are not today.
  `server.test.ts` passes.
- **Commit:** `Serve the board a school actually uses`

---

## Stage 2 — Connection test migration

Full detail in [`FLEET_CONNECTION_TEST_MIGRATION.md`](./FLEET_CONNECTION_TEST_MIGRATION.md).

### 2.1 Port the 14 connection tests

- **Objective:** `web/lib/fleet-connection.test.ts` exists with the `FakeSocket` harness and
  all 14 tests, adapted only for import style.
- **Files:** `web/lib/fleet-connection.test.ts` (new). **No production file.**
- **Depends on:** nothing.
- **Testing:** 223 → 237. If a test cannot be written without changing
  `web/lib/fleet-connection.ts`, stop and report it — that would mean a seam problem, not a
  licence to edit.
- **Commit:** `Test that the board reconnects on its own`

### 2.2 Fix the accidental assertion, add the unknown-type case

- **Objective:** Test 14 asserts connection transitions rather than the full notification
  sequence — it currently passes only because that scenario sends no history frame. Add the
  sibling covering a frame whose `type` is unknown.
- **Files:** `web/lib/fleet-connection.test.ts`.
- **Depends on:** 2.1.
- **Testing:** 237 → 238. Remove `parse()`'s `known.includes` guard and confirm the new test
  fails; restore it.
- **Commit:** `Assert what the connection test meant to assert`

### 2.3 Cover history and event merging

- **Objective:** The 10 new tests. The board's de-duplication of a replayed history is
  currently unverified, and it is what stops a Teacher seeing this morning's fault twice.
- **Files:** `web/lib/fleet-connection.test.ts`.
- **Depends on:** 2.2.
- **Testing:** 238 → 248. **Each new test must be shown to fail against a deliberately broken
  copy of the behaviour it covers.** A test that passes against both the correct and the
  broken implementation is not coverage. The battery-retention case matters most: a
  regression there empties the charge history silently, and surfaces as a *wrong* endurance
  number rather than a missing one.
- **Commit:** `Cover the history merge the board has always done untested`

### 2.4 Retire `dashboard/`

- **Objective:** ADR-0010. Only now is it safe.
- **Files:** delete `dashboard/`; `package.json` workspaces; `vitest.config.ts` (drop the
  project and the stale two-boards comment); `package-lock.json`.
- **Depends on:** 2.3 **and** 1.4. The ground station must be serving `web/out` before the
  other board is removed, or a School is served nothing.
- **Testing:** Suite drops by 49 to ~199, all passing. Ground station serves the board. Full
  device and desktop audits — this is the first task that changes what a School receives.
- **Commit:** `Retire the Vite dashboard`

---

## Stage 3 — Browser simulation runtime

ADR-0013. Fixes audit finding **F5**: the deployed board cannot currently animate, so
`climbing` and `descending` are unreachable and the scope is a still frame.

### 3.1 Introduce `FleetLink`, adapt the existing connection to it

- **Objective:** A named seam with one implementation and **no behaviour change**.
- **Files:** `web/lib/fleet-link.ts` (new interface), `web/lib/fleet-connection.ts`
  (implements it, otherwise untouched), `web/components/FleetProvider.tsx`.
- **Depends on:** 2.1 — the connection tests must exist before this is reshaped.
- **Testing:** All 248 pass unchanged. This task is done correctly when the diff is
  uninteresting.
- **Commit:** `Name the seam the board reads its Fleet through`

### 3.2 Build `LocalFleetLink`

- **Objective:** The Fleet core, the simulator and the history recorder running in the
  browser, producing the same `FleetSnapshot` a socket does.
- **Files:** `web/lib/local-fleet-link.ts` (new), `web/package.json` (depends on
  `fleet-core`).
- **Depends on:** 1.2, 3.1.
- **Testing:** New tests driven by `TestClock`: a Fleet appears; Status changes over time;
  ageing reaches Stale and then Offline; events are recorded; altitude actually changes so a
  vertical rate can be derived. **The last one is the point of the stage** — it is the thing
  that is impossible today.
- **Commit:** `Run the Fleet in the browser`

### 3.3 Equivalence between the two links

- **Objective:** Prove a screen cannot tell them apart. This is the assertion the whole
  architecture rests on.
- **Files:** `web/lib/fleet-link.test.ts` (new).
- **Depends on:** 3.2.
- **Testing:** The same Fleet, driven the same way through both links, yields snapshots of
  the same shape with the same Statuses and the same events.
- **Commit:** `Prove both links tell the board the same story`

### 3.4 Choose the link, and retire the fixtures from the demo path

- **Objective:** `FleetProvider` selects `LocalFleetLink` for the demo build and `/demo`,
  `SocketFleetLink` otherwise. Exactly one module knows a Fleet is simulated.
- **Files:** `web/components/FleetProvider.tsx`, `web/lib/scenarios.ts` (retained for
  `/showcase` only).
- **Depends on:** 3.3.
- **Testing:** `DemoBoard.test.tsx` passes. Live check on the demo route: Drones move, charge
  falls, Status changes, a Drone climbs and the phase reads `climbing`. Confirm the sample
  Fleet is still labelled unmistakably.
- **Commit:** `Give the demonstration a Fleet that behaves`

### 3.5 Lift the observers into the provider

- **Objective:** Fix a live defect. `AltitudeTracker` and `AlertTracker` are refs inside the
  Tower screen, so navigating away and back resets them — losing every vertical rate and
  every Alert start time mid-lesson.
- **Files:** `web/components/FleetProvider.tsx`, `web/components/TowerScreen.tsx`.
- **Depends on:** 3.4.
- **Testing:** A test that navigates away and back and asserts Alert start times survive.
- **Commit:** `Keep what the board has observed across a navigation`

### 3.6 Enforce the component import boundary

- **Objective:** No teacher-facing component may import the simulator.
- **Files:** lint or dependency-check config.
- **Depends on:** 3.4.
- **Testing:** Add a forbidden import temporarily, confirm it fails, remove it.
- **Commit:** `Keep the simulator out of the screens`

---

## Stage 4 — Flight Control Center

### 4.1 Rename the route and the screen

- **Objective:** `/tower` → `/control`; `TowerScreen` → `ControlScreen`; heading reads
  *Flight Control Center*. `/tower` redirects — a Teacher may have bookmarked it.
- **Files:** `web/app/(app)/control/page.tsx`, `web/app/(app)/tower/page.tsx` (redirect),
  `web/components/ControlScreen.tsx`, `web/components/SiteNav.tsx`.
- **Depends on:** 3.5.
- **Note:** Navigation keeps six destinations for now. It reduces to five in Stage 7, when
  Reports exists to receive History and Maintenance. Removing them earlier would strand them.
- **Testing:** Suite passes; both routes load; the redirect works.
- **Commit:** `Rename the tower to the Flight Control Center`

### 4.2 The attention bar shows one Alert at a time

- **Objective:** The queue is worked down, not read. The count stays; beneath it exactly one
  Alert with its action and the Student's name.
- **Files:** `web/components/ControlScreen.tsx`, new `AttentionBar` section.
- **Depends on:** 4.1.
- **Testing:** Component tests — the worst Alert is the one shown; the count is present at
  zero with the reassuring sentence; the Student's name appears when assigned.
- **Commit:** `Show the Teacher the next thing, not every thing`

### 4.3 Acknowledgement

- **Objective:** Requirements F6–F8, F10. `AcknowledgementTracker` in the provider; the queue
  filters; the strip keeps a quiet acknowledged line.
- **Files:** `web/lib/acknowledgement.ts` (new), `web/lib/vitals.ts` (`alertQueue` takes
  acknowledgements — derivation stays pure), `web/components/FleetProvider.tsx`,
  `AttentionBar`, `FlightStrip`.
- **Depends on:** 4.2.
- **Testing:** Acknowledging removes it from the queue and the count; it returns when severity
  worsens; it is forgotten when the condition clears so a recurrence reads as new;
  acknowledging never alters Telemetry or any Drone.
- **Commit:** `Let the Teacher work the queue down`

### 4.4 The scope

- **Objective:** Linked selection between mark and strip; altitude carried by mark size *and*
  stated in the strip. No room outline (ADR-0012).
- **Files:** `web/components/FormationMap.tsx` → `Scope.tsx`, `ControlScreen`.
- **Depends on:** 4.1.
- **Testing:** Selecting a strip highlights its mark and the reverse; conflict lines are drawn
  once per pair; a Drone with no position claims no separation.
- **Commit:** `Let the scope and the strips point at each other`

### 4.5 Student wording throughout

- **Objective:** Requirement D2. `pilots` → `students` in the Logbook and every identifier.
  User-facing text is already clean.
- **Files:** `web/lib/logbook.ts`, `web/components/ControlScreen.tsx`, `SettingsScreen.tsx`,
  `web/lib/logbook.test.ts`.
- **Depends on:** 4.1.
- **Testing:** Import of a logbook written with `pilots` still restores — a Teacher's records
  from last term must survive a rename. This is the whole risk of this task.
- **Commit:** `Call a Student a Student`

### 4.6 The running Lesson moves into Control

- **Objective:** One position. A Teacher never changes screen mid-lesson. The lesson strip —
  label, elapsed, End — sits at the top of Control; the Lesson screen shows a card pointing
  there.
- **Files:** `web/components/ControlScreen.tsx`, `web/components/LessonScreen.tsx`.
- **Depends on:** 4.2.
- **Testing:** Starting a Lesson navigates to Control; the strip appears only while running;
  ending returns to the Lesson screen with the summary. Every existing Lesson test passes.
- **Commit:** `Put the running lesson where the Teacher is watching`

---

## Stage 5 — Simulated command system

ADR-0011. The first messages travelling from board toward Fleet.

### 5.1 Contract: commands and the commandable seam

- **Objective:** `DroneCommand`, `CommandKind`, `ClientMessage`, `command-outcome` on
  `ServerMessage`, `CommandableSource`, `isCommandable`. Rewrite — not delete — the comment
  stating there is no message in the other direction; its reasoning is still the constraint.
- **Files:** `contract/src/index.ts`.
- **Depends on:** 1.2.
- **Testing:** Typecheck. `isCommandable` returns false for a plain source and true for one
  implementing the interface.
- **Commit:** `Give the contract a direction it never had`

### 5.2 The simulator accepts commands, and learns to hold

- **Objective:** `SimulatedTelemetrySource implements CommandableSource`. Add `hold` — set the
  target altitude to the current altitude. No equivalent exists today.
- **Files:** `fleet-core/src/simulator/simulated-telemetry-source.ts` and its test.
- **Depends on:** 5.1.
- **Testing:** Each command produces the modelled behaviour; `hold` stops a climb without
  landing; a latched emergency stop stays latched; **take-off is not a command** and cannot be
  issued as one.
- **Commit:** `Let the simulated Fleet be asked to come down`

### 5.3 The Fleet core routes or refuses

- **Objective:** `GroundStation.command()` guarded by `isCommandable`. A non-commandable
  source produces a refusal with a reason, never silence.
- **Files:** `fleet-core/src/fleet.ts`, `fleet-core/src/fleet.test.ts`.
- **Depends on:** 5.2.
- **Testing:** A commandable source receives it; a plain source refuses with a readable
  reason; a command for an unregistered Drone is dropped as Telemetry from one is.
- **Commit:** `Refuse a command the Fleet cannot honestly carry`

### 5.4 Both links can send

- **Objective:** `FleetLink.send(command)` on `LocalFleetLink` and `SocketFleetLink`; the
  server accepts `ClientMessage` and replies with an outcome.
- **Files:** `web/lib/fleet-link.ts`, `local-fleet-link.ts`, `fleet-connection.ts`,
  `ground-station/src/server.ts` and its test.
- **Depends on:** 5.3, 3.3.
- **Testing:** Extend the equivalence test — both links deliver a command and surface the
  outcome identically. A malformed client frame is dropped, not crashed on.
- **Commit:** `Carry a command over both links`

### 5.5 Commands on the strip

- **Objective:** Land and Hold always visible; More for auto-land; emergency stop as a guarded
  press-and-hold with a keyboard confirmation path. `CommandTracker` in the provider.
  **Nothing optimistic.**
- **Files:** `web/lib/command-tracker.ts` (new), `web/components/FlightStrip.tsx`,
  `web/components/ui/GuardedButton.tsx` (new), `FleetProvider`.
- **Depends on:** 5.4, 4.3.
- **Testing:** The three lifecycle states appear in order — sent, waiting, then resolved only
  by Telemetry; a command with no Telemetry effect never reads as done; a refusal shows its
  reason; press-and-hold does not fire on a short press; the keyboard path requires explicit
  confirmation. Device audit — the guarded control must work on touch.
- **Commit:** `Let the Teacher bring a Drone down`

### 5.6 Scenario panel, separated

- **Objective:** Requirement C9. Fault injection, link loss and battery setting live in
  Settings under their own heading. They never appear on a flight strip.
- **Files:** `web/components/SettingsScreen.tsx`, new `ScenarioPanel`.
- **Depends on:** 5.5.
- **Testing:** A test asserting no scenario trigger renders on the Control screen. This is the
  requirement most likely to erode later, so it gets an explicit guard.
- **Commit:** `Keep pretending-things-broke away from asking-it-to-land`

### 5.7 The simulation label

- **Objective:** Requirement C5. Continuous, in words, in the header. Not a badge, not a
  colour — the eye stops seeing those.
- **Files:** `web/components/SiteHeader.tsx`.
- **Depends on:** 3.4.
- **Testing:** Present on every screen of a simulated build; absent on a live one; commands
  are visibly unavailable with a reason when the source refuses them.
- **Commit:** `Never let a Teacher wonder which Fleet they are commanding`

---

## Stage 6 — Lesson Planner and Students

### 6.1 Logbook grows

- **Objective:** Students list, Exercises, and the plan on `LessonRecord`; Commands recorded
  against a Lesson (C7).
- **Files:** `web/lib/logbook.ts`, `web/lib/logbook.test.ts`.
- **Depends on:** 4.5, 5.5.
- **Testing:** Every new field defaults on import from an older export. This is the recurring
  risk in this file and has bitten once already.
- **Commit:** `Give the Logbook a class list and a lesson plan`

### 6.2 Assignment column

- **Objective:** Drones in board order, a name field beside each, `Tab` down the column,
  autocomplete from the class list. Warnings inline: not ready, out of service, already
  assigned, more Students than Ready Drones.
- **Files:** `web/components/LessonScreen.tsx`, new `AssignmentColumn`, `StudentNameField`.
- **Depends on:** 6.1.
- **Testing:** Six assignments by keyboard alone; D7 prevents a double assignment; each
  warning appears beside the row causing it. Device audit — this is a form on a tablet.
- **Commit:** `Assign a class in under a minute`

### 6.3 Exercise list

- **Objective:** Ordered, add/remove/reorder by button not drag, optional duration.
- **Files:** `web/components/LessonScreen.tsx`, new `ExerciseList`.
- **Depends on:** 6.1.
- **Testing:** Order survives a reload; an Exercise with no duration is normal, not
  incomplete; reordering is reachable by keyboard.
- **Commit:** `Let a lesson have a shape`

### 6.4 Starting a Lesson with no plan at all

- **Objective:** Requirement E7, and it gets its own task **because it is the requirement most
  likely to be destroyed by 6.2 and 6.3.** Planning is an affordance, never a gate.
- **Files:** `web/components/LessonScreen.tsx`.
- **Depends on:** 6.3.
- **Testing:** Start with no label, no Students, no Exercises. Everything downstream works —
  Control, alerts, commands, ending, the report.
- **Commit:** `Keep the lesson startable with nothing filled in`

### 6.5 The Exercise on the flight strip

- **Objective:** Requirement B6 — intent beside behaviour. Display only; B7 was dropped, so
  nothing compares them automatically.
- **Files:** `web/components/FlightStrip.tsx`.
- **Depends on:** 6.3, 4.6.
- **Testing:** Shown when a Lesson has Exercises; absent rather than blank when it does not.
- **Commit:** `Show what a Drone is meant to be doing`

### 6.6 Students screen

- **Objective:** The class list; today's assignments with live Status; which Drones a Student
  has flown. **No per-Student incident history** — see `DESIGN.md` §7.1.
- **Files:** `web/app/(app)/students/page.tsx`, `web/components/StudentsScreen.tsx`.
- **Depends on:** 6.2.
- **Testing:** Names persist between Lessons; clearing assignments works; a test asserting
  incidents are **not** attributed to a Student.
- **Commit:** `Add the class, without keeping a record against a child`

---

## Stage 7 — Reports

### 7.1 The Reports shell

- **Objective:** Three sections — Lessons, Fleet reliability, Timeline — receiving the
  existing History and Maintenance content intact.
- **Files:** `web/app/(app)/reports/page.tsx`, `web/components/ReportsScreen.tsx`, moving
  `HistoryScreen` and the reliability half of `MaintenanceScreen`.
- **Depends on:** 6.6.
- **Testing:** Every existing History and Maintenance behaviour still reachable. Nothing is
  lost; it moves.
- **Commit:** `Gather what happened into one place`

### 7.2 "What needs doing" moves to Fleet

- **Objective:** Maintenance's this-morning half joins the board, where the question belongs.
- **Files:** `web/components/FleetScreen.tsx`, `MaintenanceScreen.tsx` (retired once empty).
- **Depends on:** 7.1.
- **Testing:** Service-state controls work from their new home; existing Maintenance tests
  move with the behaviour.
- **Commit:** `Put what needs doing beside the Drones it needs doing to`

### 7.3 Navigation reduces to five

- **Objective:** Control · Fleet · Lesson · Students · Reports. Settings moves to the header.
  Old routes redirect.
- **Files:** `web/components/SiteNav.tsx`, `SiteHeader.tsx`, redirect pages.
- **Depends on:** 7.2. **Only now is this safe** — History and Maintenance have somewhere to
  live.
- **Testing:** Every old route redirects rather than 404s. Device audit — the nav wraps on a
  phone.
- **Commit:** `Reduce the navigation to the five places a Teacher goes`

### 7.4 The Lesson report

- **Objective:** Label, times, Students and their Drones, Exercises, incidents, per-Drone
  counts, Commands issued. Captured at close, not recomputed.
- **Files:** `web/components/ReportsScreen.tsx`, new `LessonReport`.
- **Depends on:** 7.1, 6.1.
- **Testing:** A report written today still reads correctly once the ground station's history
  has aged those events out — the property the whole capture-at-close design exists for.
- **Commit:** `Write the lesson down before the evidence ages out`

### 7.5 Printing

- **Objective:** Requirement G3. Black and white on A4, no chrome, no scrolling, School and
  date in the header.
- **Files:** `web/app/globals.css` (print styles), `LessonReport`.
- **Depends on:** 7.4.
- **Testing:** Print preview at A4. Severity legible with colour removed entirely — which the
  product already guarantees, so this checks it rather than adds it.
- **Commit:** `Make the lesson report printable on a school printer`

---

## Stage 8 — Polish

### 8.1 Motion

- **Objective:** Nothing moves on the arrival of bad news; counts transition rather than
  animate; marks move at the cadence of Telemetry rather than on an easing curve;
  `prefers-reduced-motion` removes all of it with nothing lost.
- **Files:** `web/app/globals.css`, affected components.
- **Depends on:** 7.5. **Testing:** Reduced-motion check; an Alert arriving does not displace
  what is being read. **Commit:** `Let motion earn its place`

### 8.2 States sweep

- **Objective:** Every screen draws loading, empty, partial, error and ideal — checked against
  `REQUIREMENTS.md` §4 rather than by eye.
- **Depends on:** 8.1. **Testing:** One test per screen per state that is not already covered.
  **Commit:** `Draw the states nobody draws`

### 8.3 Device and desktop audits

- **Objective:** 8 device profiles, 3 desktop widths, tap targets hit-tested.
- **Depends on:** 8.2. **Testing:** Both audits clean. Particular attention to the guarded
  emergency stop and the assignment form on tablets. **Commit:** `Fix what the device audit found`

### 8.4 Records weight

- **Objective:** Requirement H6 — export offered at Lesson close; a stored-size warning before
  a quota failure rather than after.
- **Depends on:** 8.2. **Testing:** Simulated quota failure degrades to in-memory and says so.
  **Commit:** `Warn before the records outgrow the browser`

### 8.5 Boundary and dead-prefetch check

- **Objective:** Confirm every import boundary from `ARCHITECTURE.md` §7.6 holds. Decide audit
  finding **F7** — `next/link` prefetch 404s under static export.
- **Depends on:** 8.3. **Testing:** Boundary violations fail the build; console clean on
  navigation. **Commit:** `Hold the boundaries, quiet the console`

### 8.6 Final verification

- **Objective:** The whole of `REQUIREMENTS.md`, point by point, as the input to Phase 7.
- **Depends on:** everything. **Testing:** Full suite, both typechecks, production build, both
  audits, live check of every route. **Commit:** `Verify the redesign against its requirements`

---

## Risk register

| Risk | Where | Handling |
|---|---|---|
| The `fleet-core` move breaks the ground station | 1.2 | Tests move unchanged and must pass unchanged. If they need editing, it was not a move — stop and report |
| Deleting `dashboard/` loses coverage | 2.4 | Gated on 2.3. Parity evidence is in `CODEBASE_AUDIT.md` Appendix A |
| A School is served nothing | 2.4 | 1.4 must land first. Explicit dependency |
| A Teacher's records break on rename | 4.5, 6.1 | Import defaults every field. Already bitten once |
| The interface reads as "commanding real aircraft" | 5.5, 5.7 | Continuous text label; refusal visible; scenario triggers separated |
| E7 destroyed while building the planner | 6.4 | Given its own task, its own test and its own commit |
| Commands drift toward hardware | 5.1–5.3 | `isCommandable` is the only route; no hardware source implements it; ADR-0011 requires a successor |
| Scope creep into the flight area | 4.4 | ADR-0012. No room outline is drawn |

## Rollback

Every task is one commit and reverts cleanly on its own. Three carry more than a revert:

- **1.2** — a move; reverting restores the previous layout wholesale.
- **2.4** — deletion. Recoverable from history, but 1.4 must hold or a School loses its board.
- **5.x** — the command path adds a message direction. Reverting the contract change means
  reverting every task above it in the stage. Land 5.1–5.4 close together.

## What this plan does not include

No flight area (ADR-0012). No hardware commands (ADR-0011). No behaviour-versus-intent
alerting (B7, dropped). No ground-station-backed records (`ARCHITECTURE.md` §8 — a second
write path, needing its own ADR). No decision on `/showcase` and its `three.js` dependency
(audit F8) — it is untouched by all of the above.
