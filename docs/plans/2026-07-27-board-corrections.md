# Work plan — board corrections and the hardware path

Date: 2026-07-27 · Author: Planner terminal · Status: **ready to execute** — all decisions
taken (§9)

Seven work items, ordered so nothing blocks anything above it. Each is written to be
executed by the software-engineering terminal without coming back to ask, and checked by
the code-review terminal against a stated assertion.

---

## 0. Read this first — the screenshots under review are of an old build

The feedback that produced this plan was given against screenshots whose navigation reads:

```
Flight Deck | Fleet | Tower | Lesson | History | Maintenance | Settings
```

`web/components/SiteNav.tsx:25-29` currently reads:

```
Control | Fleet | Lesson | Students | Reports
```

`Tower` was renamed to the Flight Control Center in commit `7fbbb17` ("Reduce the
navigation to the five places a Teacher goes"), and `web/app/(app)/tower/page.tsx` is now
only a redirect stub. History and Maintenance left the primary navigation per
`docs/DESIGN.md` §3.1.

**Consequence:** part of the feedback may already be fixed on `main`, and any judgement of
"how it looks" made from those images is a judgement of an older board.

**Action before W1 starts:** rebuild and re-photograph the two screens, so the work is
aimed at the current build.

```powershell
npm run build --workspace=web
node scripts/shot.mjs control-after /control 1440
node scripts/shot.mjs lesson-after /lesson 1440
```

Run from PowerShell, not Git Bash — Git Bash rewrites the bare `/control` argument into a
Windows path. `scripts/shot.mjs` serves `web/out` and does **not** build for you.

---

## W1 — The scope: a fixed room, square cells, and only the Drones moving

**Priority: highest.** This is a real bug with a located cause, and it is the item the
feedback was most emphatic about.

### Goal

Make the scope's grid and frame hold still while Drones move within them, on square cells
of one metre.

### The cause

`web/components/Scope.tsx:311-321`, inside `roomExtent()`:

```ts
const westM = Math.min(...easts) - 1
const eastM = Math.max(...easts) + 1
const southM = Math.min(...norths) - 1
const northM = Math.max(...norths) + 1
const widthM = Math.max(1, eastM - westM)
const heightM = Math.max(1, northM - southM)
```

The extent is derived from **the live positions of the Drones**, and it is recomputed on
every Fleet State. So on every telemetry tick:

1. `westM`/`northM` move, so `project()` moves — **every grid line shifts** (`Scope.tsx:84-105`).
2. `widthM`/`heightM` change, so the `aspectRatio` style on the container changes
   (`Scope.tsx:74`) — **the frame itself reshapes**.
3. `gridLines()` computes `step = Math.ceil((high - low) / 12)` (`Scope.tsx:388`) — so the
   **number of cells changes** as the Fleet spreads out or closes up.
4. `percentOf()` (`Scope.tsx:344-347`) renormalises each Drone into that same moving box.

Point 4 is why the symptom reads the way it does. A Drone moving east while the box's east
edge moves east with it lands at nearly the same percentage — so the Drone looks stationary
and the grid looks like the thing in motion. The report was exactly right.

It is also why the cells are not square: the frame takes the room's aspect ratio, which is
whatever shape the Fleet happens to be standing in.

### Approach

1. **Replace the derived extent with a fixed, square display window.** Keep `roomExtent()`'s
   signature and its `project` / `projectOf` / `percentOf` members — every caller and the
   existing `Scope.test.tsx` depend on them. Change only how the bounds are chosen.

2. **Choose the window from a fixed ladder, not from the data.** Pick the smallest square
   side from a constant ladder — `[8, 12, 16, 24, 32]` metres — that contains every placed
   Drone, centred on the origin. Sketch:

   ```ts
   const WINDOW_SIDES_M = [8, 12, 16, 24, 32] as const
   ```

   **Cell size is half a metre at the default window**, chosen by the product owner from a
   rendered comparison on 2026-07-27. On an 8 m window that is 16 cells across — roughly a
   centimetre per cell on a laptop, which is what "one centimetre" in the original request
   turns out to have meant. It is a display density, not a claim about the room.

   The step cannot stay at 0.5 m for every window: at 32 m it would draw 64 lines per axis
   and the grid becomes a mesh. Tie the step to the window so the count stays legible:

   | Window | Step | Cells across |
   |---|---|---|
   | 8 m | 0.5 m | 16 |
   | 12 m | 0.5 m | 24 |
   | 16 m | 1 m | 16 |
   | 24 m | 1 m | 24 |
   | 32 m | 2 m | 16 |

   The rule is: **keep cells across between 16 and 24.** The step is a pure function of the
   window, so it is as stable as the window is — and the window only ever grows, rarely, and
   visibly. The caption always states the current step, so a Teacher is never counting cells
   of an unknown size.

   ```ts
   /** Metres per grid cell, chosen from the window. Never from the Drones. */
   function gridStepM(windowSideM: number): number
   ```

3. **The window may grow and must never shrink while the component is mounted.** Hold the
   chosen side in a ref. A Drone hovering on a boundary would otherwise flip the window
   between two sizes every tick, which reintroduces the moving grid in a subtler form.
   Growth is rare, visible, and correct; shrinkage is a jitter source with no benefit.

4. **Square frame.** `aspectRatio` becomes the constant `1`, and the `viewBox` becomes
   `0 0 side side`. Square frame plus a constant metre step gives square cells with no
   further work.

5. **Fixed grid step.** Delete the `Math.ceil((high - low) / 12)` adaptation in
   `gridLines()`. Lines fall on whole metres at `GRID_STEP_M`. At the 32 m window this is 32
   lines per axis, which is dense but bounded and only reachable by a Fleet spread across a
   sports hall.

6. **Say the scale in the caption.** `Scope.tsx:167-174` currently prints
   `{widthM} m × {heightM} m`. Replace with the current cell size — `"Grid: 0.5 m"` at the
   default window — because with a fixed window the frame's size is a property of the display
   and the cell is the thing a Teacher can actually use to judge a distance. It must be read
   from `gridStepM()`, never hard-coded, or it will lie the first time the window grows. This
   is the "scale reference" that `docs/DESIGN.md` §4.3 already calls for.

7. **A Drone outside the largest window is clamped to the edge and said in words.** It must
   not be dropped silently and must not stretch the window. Render it on the boundary and
   add a caption line naming it. This is an honesty rule, not a nicety — a Drone missing
   from the scope reads as a Drone that is not flying.

### What could break

- `Scope.test.tsx` exercises `roomExtent()` directly. Expect failures there; they are the
  point. Update the expectations, do not weaken the assertions.
- `HistoryScreen.tsx` renders `Scope` without `vitals` (see the prop comment at
  `Scope.tsx:34-39`). Confirm it still renders; the window logic must not assume `vitals`.
- The `-1` metre padding disappears. A Drone at exactly the origin used to sit in a 2 m box
  and will now sit in an 8 m one. That is the intended change, not a regression.
- **Label legibility against a denser grid.** `Scope.tsx:183-186` records a bug already found
  once: six Drone labels in a 7 m strip overlapped into one unreadable line. Doubling the
  number of grid lines behind those labels is the change most likely to bring the complaint
  back in a new form — not overlap this time, but names competing with the rules behind them.
  If it reads badly in the screenshot, the fix is to lighten the grid stroke, **not** to
  reduce the cell count, which was chosen deliberately.

### Relationship to ADR-0012

ADR-0012 defers the flight area, and `docs/DESIGN.md` §4.3 says **"No room outline, no
zones, no boundaries."** A fixed window does not violate this, but the distinction has to be
written down or it will be mistaken for a violation in review:

> The window is a property of the **display**, not a claim about the room. It says "this is
> how much space is being drawn", never "this is where the Drones may fly". Nothing is drawn
> at its edge, and no Alert derives from it.

**Write this as `docs/adr/0014-a-fixed-scope-window.md`** as part of this item. Without it,
the next reader deletes the change.

### Verification

- `npm test` — `Scope.test.tsx` green.
- **New test, the one that pins the bug.** Render `Scope` with a Fleet, re-render with the
  same Drones at different positions, and assert the grid did not move:
  - the `<svg>` `viewBox` attribute is identical across both renders
  - the `x1` of every vertical grid `<line>` is identical across both renders
  - at least one Drone's `left`/`top` style **did** change

  jsdom reads SVG attributes and inline styles fine, so this is genuinely testable here —
  unlike the layout invariants that CLAUDE.md warns cannot be caught in jsdom.
- **Screenshot.** Build, then `node scripts/shot.mjs scope-after /control 1440` from
  PowerShell. Confirm by eye that cells are square. A wrong aspect ratio passes jsdom green.

---

## W2 — XYZ coordinates

### Goal

Show a selected Drone's position as three numbers, without turning the board into a
numeric readout.

### What already exists — no contract change is needed

| Axis | Field | Location |
|---|---|---|
| X | `LocalPosition.eastM` | `contract/src/index.ts` — metres east of setup point |
| Y | `LocalPosition.northM` | same |
| Z | `Telemetry.altitudeM` | `contract/src/index.ts` — height above its own take-off point |

All three are already carried. `altitudeM` is optional: **`undefined` means the airframe
cannot report height at all, `null` would mean it can and has nothing to say.** That
distinction is load-bearing (see the `Telemetry` doc comment) and must survive into the
display — an absent Z is written as "not reported", never as `0.0`.

### Decided: on every flight strip

Coordinates go on **every** flight strip, not only the selected Drone.

This overrides two passages in `docs/DESIGN.md`, and the override has to be written into
that document **in the same PR**:

- **§1.2** refuses *"numeric readouts as the primary language"*.
- **§4.4** fixes the strip's anatomy as *Drone Name · Student · phase · height with
  direction · charge with time remaining · response age*, then Exercise, separation, Alerts,
  Commands.

**This is not optional bookkeeping.** The code-review terminal reviews a branch against the
spec (§8). If `docs/DESIGN.md` still refuses numeric readouts when the PR lands, review will
correctly reject work that is doing exactly what was asked for. Amend the document or the
process fights itself.

### Approach

1. Amend `docs/DESIGN.md` §4.4 first: add the coordinate group to the stated strip anatomy,
   and add a sentence to §1.2 narrowing the refusal — numbers are not the *primary*
   language, and position is carried as a labelled coordinate group in addition to the
   instruction, not instead of it.
2. Add the group to the strip in `ControlScreen.tsx`, on its own line beneath the head row.
   It must not be inserted into the head row: §4.4's whole argument is that the eye learns
   fixed positions, and pushing charge and response-age sideways would break every Teacher's
   existing scan path for a value they read far more often.
3. Format: `X 2.4 m E · Y 1.1 m N · Z 1.7 m` — each axis labelled with its letter *and* its
   direction, so the letters are learnable without being the only key.
4. `altitudeM === undefined` renders `Z not reported`. **Never `0.0`.** An airframe with no
   barometer and one sitting on the floor are different facts, and `docs/DESIGN.md` §11.1
   requires them to be drawn differently.
5. A Drone with no `position` at all renders no coordinate line — not a line of dashes.
6. Round to one decimal. `simulated-telemetry-source.ts:348` already rounds to 2 dp; a third
   digit is precision the Telemetry does not have.
7. Same readout in `DroneDetailDialog.tsx`.

### What could break

- **Strip height.** `docs/DESIGN.md` §4.4 records a bug that was already found and fixed
  once: *"A strip wraps its Alerts onto following lines, and those lines paint over an
  expanded target — leaving the bottom half of it unclickable on a tablet."* Adding a line to
  every strip is exactly the change that reintroduces it. Hit-test the Command buttons on a
  narrow viewport, per §11.3, which requires this be verified by hit-testing rather than by
  reading the CSS.
- **Six strips each one line taller** pushes Commands below the fold on a phone. Photograph
  at 390 px before calling this done.

### Out of scope

Adding an up-axis to `LocalPosition`. Z lives on `Telemetry` because altitude and horizontal
position come from different sensors with different availability, and merging them would
lose the "no barometer" versus "no reading" distinction the `Telemetry` doc comment protects.

### Verification

- `npm test`. New tests: a Drone with `altitudeM: undefined` renders "not reported" and does
  **not** render "0"; a Drone with no `position` renders no coordinate line.
- `FlightStrip.test.tsx` must still pass — it asserts the existing anatomy.
- Screenshots at 1440 px and 390 px. jsdom cannot see a strip that grew past the fold.

---

## W3 — "Keep an eye on it" → professional register

### Goal

Replace the service-state middle label with aviation and risk-management vocabulary.

### Files

`web/lib/logbook.ts:26-29`:

```ts
watch: {
  label: 'Keep an eye on it',
  meaning: 'Usable, but it has been misbehaving. Worth watching this lesson.',
},
```

### Approach

Recommended replacement, consistent with the `In service` / `Out of service` pair either
side of it:

```ts
watch: {
  label: 'Under observation',
  meaning: 'Serviceable. A recent fault history requires monitoring during the lesson.',
},
```

`Under observation` is standing airworthiness vocabulary, parallel in grammar to the two
labels around it, and free of jargon a Teacher would have to be trained on. Rejected:
*Serviceable with limitations* (implies a documented limitation the product cannot name)
and *Monitor* (a verb where the other two are states).

### The hazard the reviewer must check

**`ServiceState` is a serialized key.** The string `'watch'` is persisted in the browser
logbook. Change the `label` and `meaning` only. **Renaming the `'watch'` key silently
invalidates every stored service decision** on every Teacher's laptop, with no migration and
no error.

### Verification

`npm test`, `npm run typecheck`. Reviewer greps for `'watch'` and confirms the key is
untouched. Confirm no test asserts the old string.

---

## W4 — "End the lesson" needs contrast

### Goal

Give the control the visual weight of a primary action.

### Files

`web/components/LessonStrip.tsx:60-61` is currently a ghost button:

```
min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink
```

`web/components/LessonScreen.tsx:177` — "Start the lesson" — is already the filled primary:

```
min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-5 py-2 text-body font-medium text-canvas
```

### Approach

Adopt the existing filled treatment rather than inventing a tier. Match `border-0 bg-ink
text-canvas`, `px-5 py-2`, `text-body font-medium`. Two symmetrical lesson-lifecycle
controls should carry the same weight, and reusing the class string keeps the design system
honest.

Do **not** reach for a Status colour. `design.md` §9 reserves colour for exception, and
ending a lesson on time is the normal path, not a fault.

### Verification

`npm test`. Screenshot at `/control` with a lesson running; the control must be legible at a
glance across a room. Contrast of `bg-ink` on `text-canvas` is already the product's primary
pair and is known to pass.

---

## W5 — Copy register: a decision before an edit

**This item is a decision, not a task.** It must not be started as a find-and-replace.

### The conflict

The request is for wording that is professional and not friendly. The current copy is
warm on purpose, and that warmth is a recorded decision in two places:

- `CONTEXT.md` — *"The vocabulary is education-first. Aviation words are kept only where
  they carry understanding a classroom word would lose."*
- `docs/DESIGN.md` §2 — a whole table mapping internal names to classroom words, and:
  *"Severity is spoken as time, not as danger: Now · Soon · Later. 'critical/warning/info'
  is a developer's vocabulary."*

The strings arrowed in the feedback — *"Put it on charge — it should come back before the
lesson"*, *"Set this one aside. It will not be right in time"* — are that decision working
as designed. They are instructions rather than measurements, which `docs/DESIGN.md` §1.2
requires.

### Why this cannot be done piecemeal

A board that is half aviation-formal and half classroom-warm reads worse than either done
consistently. If the register changes, it changes everywhere, and `CONTEXT.md` — which is
the authority every other document defers to — changes with it.

### Decided: full conversion

The whole board moves to a professional aviation and risk-management register.
`CONTEXT.md`'s education-first rule is superseded. This is the largest and highest-risk item
in the plan — it touches nearly every user-facing string in `web/` — and it is the one most
likely to be done inconsistently if started without a written target.

### The product is English. All of it.

Stated by the product owner on 2026-07-27, and recorded because a register rewrite is
exactly the task where it could drift.

**Every string a Teacher sees is written in English.** There is no localisation, no
translation layer, and no second language anywhere in `web/`. Indonesian is the language the
team talks in; it never reaches the product.

The board is already fully English today. This item must keep it that way — the change is to
the *register*, never to the language.

### The target register, stated concretely

The engineer must not improvise this. What changes:

| Changes | Stays |
|---|---|
| Colloquialism — *"Keep an eye on it"*, *"hand out"*, *"getting large"* | **Instructions.** `docs/DESIGN.md` §1.2 requires every Alert to say what to *do*. That is usability, not warmth, and it survives the conversion intact |
| Reassurance addressed to the reader — *"Nothing has gone wrong"* | **Plain-language honesty.** A value that cannot be known is still said in words, never drawn as a zero (§11.1) |
| Second-person chattiness — *"things need you"*, *"Nothing needs you"* | **`Now · Soon · Later`** severity. `docs/DESIGN.md` §2 chose time over danger deliberately, and that reasoning is about ordering, not register |
| Contractions and dashes used conversationally | **Teacher, Student, Lesson, Exercise.** The people and the classroom nouns are correct and are not aviation's to rename |

Worked examples, to fix the target before the sweep begins:

| Now | Becomes |
|---|---|
| `3 things need you` | `3 items require action` |
| `Nothing needs you. Every Drone in contact is behaving.` | `No items require action. All Drones in contact are nominal.` |
| `5 of 6 ready to hand out` | `5 of 6 serviceable` |
| `Put it on charge — it should come back before the lesson.` | `Place on charge. Projected serviceable before the lesson.` |
| `Set this one aside. It will not be right in time.` | `Withdraw from service. Not projected serviceable before the lesson.` |
| `Nothing has gone wrong. Faults and flat batteries will appear here.` | `No incidents recorded. Faults and low-charge conditions are listed here.` |
| `Your records are getting large for a browser to hold.` | Deleted — see W6 |

### The hard boundary: five words that must not change

`Status` is a TypeScript union in `contract/src/index.ts`:

```ts
export type Status = 'Offline' | 'Ready' | 'Not Ready' | 'Flying' | 'Fault'
```

These strings are **the type, the wire format, and the display text at once.** They are
compared across `fleet-core/`, `ground-station/` and `web/`, and they appear in
`FleetEvent`, in `NEEDS_ATTENTION`, and in stored lesson records.

**Renaming them is not a copy change.** It is a contract change that breaks every stored
record and every one of the four workspaces. `Ready` and `Fault` are already correct
airworthiness vocabulary; `Not Ready` and `Offline` are plain and unambiguous.

**Out of scope for W5. If the register work is later thought to require them, that is its
own ADR and its own migration.** The same applies to `FleetEventKind` and `ServiceState`
keys — labels change, keys do not (see W3).

### Approach

1. **Write `docs/adr/0015-a-professional-register.md` first.** It states the target above,
   records that it supersedes `CONTEXT.md`'s education-first rule, and names the five Status
   strings as excluded. **No string changes land before this ADR exists**, or the next reader
   reverts the work as a violation of `CONTEXT.md`.
2. **Amend `CONTEXT.md`** in the same PR. It is the document every other document defers to;
   leaving it stating the opposite is how a codebase starts lying about itself.
3. **Inventory.** Nearly every user-facing string is in `web/components/` and
   `web/lib/*-presentation.ts` (`status-presentation.ts`, `telemetry-presentation.ts`,
   `vitals-presentation.ts`). Produce the list before editing.
4. **One pass, one PR.** A half-converted board reads worse than either register done whole.
5. **Fix the tests as part of the sweep.** Many assert on visible text and will fail. They
   are the safety net proving the inventory was complete — update them, never weaken them.
6. **Re-photograph every screen** at 1440 px and 390 px.

W3 stays a separate, smaller item and can land first: it is one label, informal by any
reading, and it unblocks nothing else.

---

## W6 — Remove "Your records" and the keyboard panel

### Goal

Delete both panels from Settings, and everything that becomes unreachable or incoherent as
a result.

### Decided, with its consequences accepted

Both panels go. Export, Import and Clear everything go with them. Lesson records, notes and
service decisions become **permanently confined to one browser profile**: no route to
another laptop, and no way to clear them short of clearing site data. That is understood and
chosen.

### Files

`web/components/SettingsScreen.tsx` — the screen has four blocks:

| Line | Block | Action |
|---|---|---|
| 45 | `<Panel title="The ground station">` | **Keep** |
| 71 | `<Panel title="Your records">` | **Remove** |
| 170 | `<ScenarioPanel />` | **Keep** — `docs/DESIGN.md` §9 requires scenario controls to live here and nowhere near a Command |
| 172 | `<Panel title="Keyboard">` | **Remove** |

Settings keeps two blocks and stays a real screen. It does not become empty.

### The removal is not confined to Settings

`web/components/LessonStrip.tsx:94-108` renders, when a lesson ends and records have grown
heavy:

> *"Your records are getting large for a browser to hold."* — with an **"Export them now"**
> button calling `exportLogbook()`.

**This must be removed in the same PR.** Left in place it produces a dead end: the Teacher is
told their records are too large for the browser, and every control that could export or
clear them has just been deleted. A warning with no remedy is worse than no warning.

Once both are gone, check for newly dead code in `web/lib/logbook.ts`:

- `recordsAreHeavy` (`logbook.ts:483`) — callers were `SettingsScreen.tsx:84` and
  `LessonStrip.tsx:88`. Both removed. Delete it.
- `exportLogbook` / `importLogbook` — verify no remaining caller, then delete.

Do not leave them as unused exports. There is no lint in this repo (`CLAUDE.md`), so nothing
will flag them later.

### A consequence to record rather than discover

Removing the Keyboard panel does **not** remove the keyboard shortcuts. `CommandPalette.tsx`
still binds `Ctrl`/`⌘`+K, and `Esc` still closes. They become undiscoverable —
functionality with no route to learning it exists.

`docs/DESIGN.md` §11.3 requires every screen and every Drone to be reachable by keyboard and
names the palette as how. That requirement still holds; only its documentation on screen is
being removed. **State this in `docs/CHANGELOG.md`** so it reads as a decision rather than
as an oversight next time someone audits accessibility.

### What could break

- No test references `Your records`, `Clear everything` or `CTRL` — removal breaks no
  existing assertion.
- `SettingsScreen.tsx` imports at line 10 include `recordsAreHeavy`. Prune the import block
  or typecheck fails.
- Records already in a Teacher's browser are untouched — no migration, nothing destroyed on
  disk. Only the route to managing them is withdrawn.

### Verification

- `npm test`, `npm run typecheck`.
- Grep confirms zero remaining references to `exportLogbook`, `importLogbook` and
  `recordsAreHeavy`.
- Screenshot `/settings` — two blocks, no gap where a panel used to be.
- Start and end a lesson with a large logbook; confirm no orphaned export prompt appears.

---

## W7 — Connecting to real drones

Carried forward from the earlier session, restated now that the hardware questions are
withdrawn.

### The position

`docs/questions-for-drone-team.md` is set aside. It is not deleted — it records what would
have to be true — but nothing in this plan waits on it.

Instead: **adopt MAVLink and develop against ArduPilot SITL.** SITL is a build of the real
autopilot firmware that runs as an ordinary desktop executable and emits real MAVLink over
UDP `127.0.0.1:14550`. It needs no aircraft, no radio, and no hardware knowledge. That makes
the whole software side finishable and testable now, which is the stated goal.

`docs/questions-for-drone-team.md` already recommends this outcome in its own Tier 0:
*"Adopting an existing standard (MAVLink) instead of inventing a custom format would save
the software team weeks and give us a free simulator."*

### Library

`node-mavlink`, now published under the ArduPilot organisation, with native TypeScript
bindings. It parses from any Node stream, so UDP needs only `node:dgram` — the `serialport`
native dependency is for serial links and is **not** required.

### Where it goes

A new `fleet-adapters/` workspace. It must not go in `fleet-core/`: ADR-0013 requires
`fleet-core` to run in a browser, and `node:dgram` would break that.

- `package.json` — add `"fleet-adapters"` to `workspaces` (currently `contract`,
  `fleet-core`, `ground-station`, `web`).
- `vitest.config.ts` — add a `projects` entry, `name: 'fleet-adapters'`, `environment:
  'node'`, copying the `fleet-core` entry's shape.
- `fleet-adapters/src/mavlink-source.ts` — one class implementing `TelemetrySource`.

### The three rules it must keep

1. **A fresh `Telemetry` object per reading.** `fleet-core/src/telemetry-ownership.test.ts`
   exists specifically to state this. The ground station compares Fleet States by reference,
   and a source that refills one buffer — which is the natural way to write a UDP adapter —
   silently rewrites Fleet States that have already been published.
2. **Inject the `Clock`.** Never call global timers. See the `Clock` doc comment in
   `contract/src/index.ts` for why the whole Stale/Offline suite depends on this.
3. **Do not implement `CommandableSource`.** ADR-0011. The UI disables Commands
   automatically via `isCommandable()`, so read-only is achieved by omission rather than by
   a guard someone can forget.

### Consequence to state plainly

Against real hardware this is **monitoring, not control**. Land, Hold and Emergency Stop
will render present-and-unavailable with a reason, per `docs/DESIGN.md` §9. Commanding a
physical aircraft is a separate decision with a flight-safety review attached, not an
increment on this work.

### Wiring

`ground-station/src/main.ts:19-27` constructs `SimulatedTelemetrySource` and passes it to
`GroundStation`. That is the only place a source is chosen. The simulator stays the default.

### Verification

- Adapter tests run against recorded MAVLink frames with a `TestClock` — deterministic, no
  socket, no sleeps.
- `expect(a.telemetry).not.toBe(b.telemetry)` across two readings, pinning rule 1.
- End to end: SITL running, ground station pointed at UDP 14550, `/control` open, real
  telemetry on the flight strips.

---

## 8. How the three terminals work together

Coordination is through **GitHub issues**, which `docs/agents/issue-tracker.md` already
establishes as this repo's spec surface. The labels are the five in
`docs/agents/triage-labels.md`.

### Roles

| Terminal | Does | Never does |
|---|---|---|
| **Planner** (this one) | Reads the code, writes specs, files issues, sets `ready-for-agent` | Writes production code |
| **Software engineer** | Claims an issue, branches, implements, opens a PR | Decides scope; re-argues a spec |
| **Code review** | Reviews the branch against the issue's Verification section | Pushes fixes to the branch |

### The loop

1. **Planner files.** One issue per work item, body copied from this document.
   ```bash
   gh issue create --title "W1 — Scope: fixed room, square cells" --body "$(cat <<'EOF'
   ...
   EOF
   )" --label ready-for-agent
   ```
2. **Engineer claims and builds.**
   ```bash
   gh issue view 42 --comments
   gh issue edit 42 --add-assignee @me
   git switch -c fix/scope-fixed-window
   ```
   Conventional commits — `fix:`, `feat:`, `docs:`, `chore:` — per `docs/DECISIONS.md`.
3. **Engineer opens a PR** with `Closes #42`.
4. **Review terminal runs `/code-review`**, which reviews on two axes: does it follow the
   repo's standards, and does it match what the issue asked for. Findings go on the PR.
5. **Engineer fixes, review re-checks, merge.**
6. **Planner updates** `docs/CHANGELOG.md` and `docs/DECISIONS.md` per the standing rule in
   `CLAUDE.md`.

### Commit convention — all three terminals write the same way

Set by the product owner on 2026-07-27: commits are **friendly, specific, and small — one
per change.**

This does not replace the conventional-commit decision recorded in `docs/DECISIONS.md` on
2026-07-24. The two combine: the prefix stays, and the subject after it carries the friendly,
specific part.

```
<type>: <what changed, in a sentence a person would say>
```

Types in use: `feat` · `fix` · `docs` · `chore` · `test` · `ci`

**Rules**

1. **One logical change per commit.** Not one file, and not one PR. The test is whether the
   subject needs the word "and" — if it does, it is two commits.
2. **The subject says what changed for a person**, not what changed in the code.
   `fix: stop the grid drifting while Drones move` beats `fix: refactor roomExtent`.
3. **Present tense, lower case after the colon, no full stop.**
4. **The body carries the why**, when the why is not obvious. The what is already in the diff.

**W1 as a worked example.** One work item, four honest commits:

```
fix: hold the scope's grid still while the Drones move
feat: draw the scope on square half-metre cells
test: pin the grid to one viewBox across two Fleet States
docs: record why the scope window is not the flight area (ADR-0014)
```

Not this:

```
fix: scope
```

**Expected volume.** W1–W7 at this granularity is roughly forty commits, spread across the
work as it is actually done. That is a real record of real changes — which is the only kind
worth having on a public profile, and it is what this convention produces on its own.

Two things stay out of it: **no empty commits, and no backdating.** A commit records when
work happened; a date that says otherwise is the one part of a git history that cannot be
corrected later.

### Rules that keep three terminals from colliding

- **One issue, one branch, one terminal.** An assignee on the issue is the lock.
- **Know when to stop and when to carry on.** The first version of this rule said to stop
  and comment on *any* spec disagreement. It was too strict: W1 came back with three
  findings, and only two of them were decisions. The third — a scope grown too tall because
  the spec capped no width — had exactly one sensible answer, and stopping for it cost a
  round trip and bought nothing.

  | Carry on, and say what you did | Stop and ask |
  |---|---|
  | The defect is plain and there is **one** sensible fix | **Several** fixes are defensible and they look different on screen |
  | The spec is silent and any reasonable reader would fill the gap the same way | Filling the gap is choosing, and the choice is the product owner's |
  | It is a bug in the work you just wrote | It changes a decision recorded in an ADR, `CONTEXT.md` or `docs/DESIGN.md` |

  Carrying on is not licence to redesign. Anything taken under the left column goes in the
  issue comment, so it is visible rather than buried in the diff. Anything under the right
  column stops, comments, and relabels `needs-info` — a design choice made quietly inside a
  200-line diff is the failure that costs the most with parallel terminals.
- **The review terminal never commits.** Findings only. One writer per branch.
- **`npm test` and `npm run typecheck` are the whole gate** — there is no lint. CI runs both
  on every push and PR (`.github/workflows/ci.yml`).
- **A visual change is not done until it has been photographed.** jsdom cannot see a broken
  aspect ratio, which is precisely what W1 is about.

### Order, and why it is not negotiable

```
W1 → W4 → W6 → W2 → W3 → W5
W7 runs in parallel throughout, in its own branch
```

**W5 must be last.** It rewrites nearly every user-facing string in `web/components/`,
which is the same set of files W2, W3, W4 and W6 touch. Run at any other position it
collides with all of them, and the conflicts land in prose — the kind a merge resolves
plausibly and wrongly. Everything structural finishes first; the register sweep then passes
over a settled board once.

**W1 first** because it is the only outright bug in the list.

**W6 before W2** because both touch `LessonStrip.tsx` / `ControlScreen.tsx`, and W6 is
subtractive. Removing before adding keeps the diffs readable.

**W3 immediately before W5**, or folded into it. It is one label and belongs to the same
conversion; landing it separately is only worth it as an early demonstration of the target
register. If W5 starts first, drop W3 and let the sweep carry it.

**W7 is genuinely independent.** It creates a new `fleet-adapters/` workspace and touches
`package.json`, `vitest.config.ts` and `ground-station/src/main.ts` — no file any other item
opens. Give it to a terminal that can run uninterrupted.

---

## 9. Decisions taken — 2026-07-27

All three were put to the product owner with their consequences stated. All three were
answered, and the answers are settled. They are recorded here so the engineering and review
terminals do not reopen them.

| # | Decision | Consequence accepted |
|---|---|---|
| 1 | **Remove "Your records" and the Keyboard panel in full** | Export, Import and Clear everything are withdrawn. Records are confined to one browser profile with no route out. `Ctrl`+K keeps working but becomes undiscoverable. W6 |
| 2 | **Full register conversion** | `CONTEXT.md`'s education-first rule is superseded and must be rewritten. ADR-0015 required before any string moves. The five `Status` strings are excluded — they are contract, not copy. W5 |
| 3 | **XYZ on every flight strip** | `docs/DESIGN.md` §1.2 and §4.4 must be amended in the same PR, or code review will correctly reject the work. Strip height grows; the tablet hit-target bug §4.4 already records must be re-tested. W2 |

### Standing assumptions, stated rather than asked

Neither of these changes the design enough to be worth blocking on. Both are cheap to
reverse if wrong.

- **Grid cell = 1 metre** (W1). `LocalPosition` is metres, `DEFAULT_PROXIMITY_WARNING_M` is
  1 m, and the room the simulator flies in is 10 m × 6 m
  (`simulated-telemetry-source.ts:479`). A centimetre grid would be roughly 1,000 cells
  across that room, so "one, one, one" is read as one metre per cell.
- **"Under observation"** as the replacement service label (W3), over *Serviceable with
  limitations* and *Monitor*, for the reasons given in that item.

Nothing in this plan is waiting on an answer.
