# Decisions

Judgement calls made while working, that are not big enough for an ADR but would otherwise
be invisible. Newest first. An entry here is a thing someone could reasonably have done
differently — not a record of every change.

For architecture, see [`docs/adr/`](./adr/). For the design system, see
[`../design.md`](../design.md) and [`DESIGN-TOKENS.md`](./DESIGN-TOKENS.md).

---

## 2026-07-30 Parent kiosk reuses Status wall page

- **Decision:** `/walls/kiosk` clones Status page; hub link included.
- **Reason:** Feature 63.
## 2026-07-30 Voice callouts are text labels first

- **Decision:** Text labels only.
- **Reason:** Feature 62.
## 2026-07-30 Scope layout presets are local chrome

- **Decision:** Preset buttons store choice in React state.
- **Reason:** Feature 61.
## 2026-07-30 Battery swap checklist is local UI only

- **Decision:** Checklist on Lesson; no hardware Commands (ADR-0011).
- **Reason:** Feature 60.
## 2026-07-30 Maintenance flag is a strip badge

- **Decision:** `MaintenanceFlag` badge; active state can bind to out-of-service later.
- **Reason:** Feature 59.
## 2026-07-30 Spare inventory is grounded count

- **Decision:** `SpareInventory` uses grounded vitals as spare.
- **Reason:** Feature 58.
## 2026-07-30 Lesson templates are a fixed starter pack

- **Decision:** `LESSON_TEMPLATES` three plans; pick wires later into ExerciseList.
- **Reason:** Feature 57.
## 2026-07-30 Roster import is paste-then-parse

- **Decision:** `RosterImport` + `parseRosterPaste` on Students; wiring into Logbook roster store can deepen later.
- **Reason:** Feature 56.
## 2026-07-30 Reports join student ids from assignments

- **Decision:** `studentIdsForLesson` reads unique names from `lesson.assignments`.
- **Reason:** Feature 55.
## 2026-07-30 Weekly digest is a 7-day lesson count

- **Decision:** `WeeklyDigest` on Reports summarises the last 7 days.
- **Reason:** Feature 54.

## 2026-07-30 End-of-day export is JSON until ZIP lands

- **Decision:** `EndOfDayExportButton` downloads todays lessons as JSON; ZIP deferred.
- **Reason:** Feature 53.
- **Note:** Filename `techtechflight-eod.json`.
## 2026-07-30 Auto PDF is confirm-then-download on lesson end

- **Decision:** `AutoPdfAfterLesson` opens from `LessonStrip` after `endLesson`; Teacher confirms download via existing `downloadReportsPdf`.
- **Reason:** Feature 52.
- **Note:** Defects list empty in the prompt payload; Reports still has the full export.
## 2026-07-30 Before/after scores are a pair on the lesson summary

- **Decision:** `formatScorePair` / `BeforeAfterScores` present before→after; storage on LessonRecord can follow.
- **Reason:** Feature 51.
- **Note:** Local presentation first.
## 2026-07-30 YOLO lesson score averages detection counts

- **Decision:** `YoloLessonScoreStrip` shows mean detection count per craft; Control passes zeros until Detect wall tallies are wired live.
- **Reason:** Feature 50.
- **Note:** Formula in `yolo-lesson-score.ts`.

## 2026-07-30 Teacher incident notes during a lesson

- **Decision:** `addTeacherIncidentNote` appends attention-severity incidents to the running
  lesson. Control and `/lesson` expose **Note incident** beside bookmark — Logbook only
  (ADR-0011).
- **Reason:** Feature #48 — Teachers need to record what they saw without waiting for
  lesson close or a fault event.
- **Note:** Auto-copied fleet incidents at close are unchanged; teacher notes use the same
  `incidents` array with `severity: 'attention'`.
## 2026-07-30 Absent Student versus Offline Drone badges

- **Decision:** **Absent** is a Teacher-marked roster flag (`absentStudentIds` in the Logbook).
  **Offline** is Telemetry Status on a Drone. Separate pills: `text-status-not-ready` vs
  `text-status-offline`. Nothing is sent to the Fleet (ADR-0011).
- **Reason:** Feature #46 — a Student away from class is not the same fact as a craft that
  lost link.
- **Note:** Absent Students still appear on the roster; assignment is unchanged.
## 2026-07-30 Double-assign blocked in the Logbook

- **Decision:** `assignStudent` returns false when `studentAssignedElsewhere` finds the name
  on another Drone. UI clash warnings stay; the Logbook is the backstop so one-tap assign
  cannot bypass D7.
- **Reason:** Feature #47 — six quick taps must not put one Student on two craft.
- **Note:** Clearing a name or swapping assignments is unchanged.
## 2026-07-30 Camera photo evidence download

- **Decision:** `PhotoEvidenceButton` on CameraPane captures the current `<video>` frame to
  PNG via an off-screen canvas; sim feeds without pixels use `downloadPlaceholderEvidence`.
  No upload or Command (ADR-0011).
- **Reason:** Feature #49 — Teachers need a still for incident follow-up without inventing
  cloud storage.
- **Note:** Filename `{droneId}-evidence.png`; school streams and sim both offer the control.

## 2026-07-30 Swap exchanges live assignments only

- **Decision:** `swapStudentAssignments` exchanges `book.students` entries between two Drones. Control shows **Swap** on every other strip while one is selected. Lesson-record assignments at start are untouched (G6).
- **Reason:** Feature 45 — a faulted airframe swap mid-lesson should not make a Teacher retype names.
- **Note:** Swap with one empty Drone moves the assignment; both empty is a no-op.

## 2026-07-30 One-tap assign walks the roster in order

- **Decision:** `assignNextRosterName` hands the next unassigned roster name to a Drone. Control targets the selected unassigned craft when one is lit; otherwise `firstUnassignedDrone` in board order. Students uses board order only.
- **Reason:** Feature 44 — six assignments in thirty seconds; typing six names is not thirty seconds.
- **Note:** Does not bypass D7 double-assign — `assignStudent` still owns clashes.

## 2026-07-30 Assigned Students read as display type on strips

- **Decision:** When a Student is assigned, Control strips show their name as `font-display text-body font-medium text-ink` beside the callsign; click opens the existing inline field. Unassigned strips keep the dashed input.
- **Reason:** Feature 43 — §4.4 wireframe puts the name at equal weight to the Drone name; a narrow input buried it.
- **Note:** Alert copy still repeats "Flown by …" under alerts; that line is for urgency, not identity.

## 2026-07-30 Land all (sim) is a ScenarioControls surface

- **Decision:** `SimLandAllButton` on Control calls `scenarios.setAltitude(id, 0)` for every airborne craft. Shown only when `scenarios` is present; hidden when nothing is up.
- **Reason:** Feature 42 — Teachers need land-all without waiting for the period timer; still not a Command path (ADR-0011 / C9).
- **Note:** End-period prompt keeps the same landing logic; this is the always-available control.

## 2026-07-30 Teacher PIN is session demo gate only

- **Decision:** `DEMO_TEACHER_PIN = '4242'` in `teacher-pin.ts`; unlock stored in `sessionStorage`. Control wraps Commands via `useTeacherPinGate`; Settings blocks behind `TeacherPinOverlay` until unlocked.
- **Reason:** Feature 41 — minimal authority gate before sensitive actions without inventing school identity.
- **Note:** Demo PIN only, not authentication; closing the tab clears unlock.

## 2026-07-30 Quiet mode hides Stop on Control strips

- **Decision:** `QuietModeToggle` sets local React state on Control; `CommandRow` accepts `hideStop` and omits Stop / Release stop when true. Land and Hover unchanged.
- **Reason:** Feature 40 — demonstrations and quiet classrooms where the red Stop must not sit on every strip.
- **Note:** UI-only; does not change what the Fleet accepts (ADR-0011).

## 2026-07-30 Classroom geofence is a fixed 8×6 m box on Scope

- **Decision:** `CLASSROOM_GEOFENCE` in `web/lib/classroom-geofence.ts` — west −4, east 4, south −3, north 3 metres from setup. Scope top-down draws a dashed `stroke-status-not-ready` rect; elevation views omit it. Caption states extents.
- **Reason:** Feature 39 — show a nominal classroom boundary without claiming it is the room (ADR-0012 / ADR-0014).
- **Note:** No geofence alerts yet; the line is orientation only.

## 2026-07-30 Height ceiling banner reuses the wall threshold

- **Decision:** `HeightCeilingBanner` on Control calls `isOverCeiling` from `height-wall.ts` (`CLASSROOM_CEILING_M = 3`). Read-only — no Command path (ADR-0011).
- **Reason:** Feature 38 — Teachers working strips need the ceiling warning without opening the height wall.
- **Note:** Banner hides at zero over-ceiling craft; names every offender.

## 2026-07-30 Freeze scope snapshot on Control

- **Decision:** **Freeze scope** snapshots Drone positions, the held window, ceiling, and
  conflict lines on Control's Scope only (`onSelect` mounts). Telemetry, strips, and
  Commands stay live — display pause only, mirroring camera wall freeze. No backend flag.
- **Reason:** Teachers need a still plan view without stopping the Fleet behind Control.
- **Note:** Reports Scope omits the control; read-only mounts never offered freeze.
## 2026-07-30 Ghost paths on the Scope

- **Decision:** **Ghost paths** are optional on Control's Scope (top-down only). Positions
  accumulate client-side in `scope-ghost-paths.ts` (two-minute window, 40 points per Drone).
  `FleetHistory` carries events and charge samples only — no wire trail yet — so Reports and
  other Scope mounts omit the toggle; enabling with no movement shows caption copy only.
- **Reason:** Teachers asked for recent trails without claiming Telemetry history that does
  not exist.
- **Note:** When position history lands on the ground station, this buffer can hydrate from
  it; until then the stub toggle documents the gap honestly.
## 2026-07-30 Lesson bookmark moment on Control and Lesson

- **Decision:** **Bookmark moment** appends `{ at, note? }` to the running lesson in the
  Logbook (`bookmarks`, capped at 50). Shown on the Control lesson strip and `/lesson` while
  the lesson is under way. No Fleet message (ADR-0011).
- **Reason:** Teachers need to mark a classroom moment without leaving Control.
- **Note:** Closed lessons keep bookmarks on the record for reports later.
## 2026-07-30 Remedial queue on Control and Lesson

- **Decision:** **Remedial queue** lives in the browser Logbook (`remedialQueue`). When a
  lesson closes, Drones with **fault**-severity incidents are merged in once each. Control
  and `/lesson` render a minimal linked list; **Done** dismisses locally — no Command
  (ADR-0011).
- **Reason:** Classroom follow-up after incidents without another screen to maintain.
- **Note:** Attention-severity incidents stay off the queue unless a Teacher adds them later.
## 2026-07-30 Lesson plan wizard on /lesson prep

- **Decision:** `LessonPlanWizard` replaces the inline label + exercises + start block with three
  steps (Name → Exercises → Confirm). A persistent **Start now** in the wizard header
  preserves E7 — planning never gates start.
- **Reason:** Feature 33 — structured prep without redesigning `LessonPrepPanel` or assignments.
- **Note:** Confirm step summarizes label (or Untitled lesson), exercises, and serviceable count.
## 2026-07-30 Training wheels mode is UI-only local state

- **Decision:** `TrainingWheelsProvider` stores on/off in `localStorage`. When on, Control and
  Lesson show a banner; Stop buttons are replaced with copy; strip and alert chips use muted
  hairline styling instead of status-fault borders. Land and Hover remain.
- **Reason:** Feature 32 — first-lesson practice without the highest-risk control surface.
- **Note:** Does not intercept `command()` or add CommandableSource paths (ADR-0011).
## 2026-07-30 Peer demo spotlight on Control

- **Decision:** Each Flight strip and the scope dock get a Spotlight button that mounts
  `PeerDemoSpotlight` — one enlarged `CameraPane` with the assigned Student name when known.
  Watch-only; no Telemetry URLs or Commands (C9, ADR-0011).
- **Reason:** Feature 31 — Teachers demo one Student's craft without leaving Control or opening
  `/walls/spotlight`.
- **Note:** Separate from `cameraDroneId` / `CameraSlide`; spotlight and slide can coexist.
## 2026-07-30 Class average strip on Control

- **Decision:** `ClassAverageStrip` sits between the Attention bar and the scope. Mean height
  averages airborne Drones with a reported altitude only; readiness is the share labelled Ready
  via `readyBoardLabel`.
- **Reason:** Feature 30 — Teachers scanning a lesson need a fleet-wide line without a wall.
- **Note:** Grounded craft at 0 m are excluded from the height average so the number tracks the
  air, not the desk.
## 2026-07-30 Live headcount is airborne vs grounded counts

- **Decision:** `LiveHeadcount` shows `vitals.airborne` true/false tallies next to the Every Drone heading.
- **Reason:** Feature 29 — glance how many are up without scanning strips.
- **Note:** Board order of strips unchanged.

## 2026-07-30 End-period prompt lands via setAltitude(0)

- **Decision:** `LessonTimerBanner.onExpire` opens `EndPeriodLandPrompt`. Sim land-all calls `scenarios.setAltitude(id, 0)` for airborne craft — not a hardware Command surface (ADR-0011 / C9).
- **Reason:** Feature 28 — period end needs a land nudge without inventing ScenarioControls.landAll.
- **Note:** Absent `scenarios` (hardware), the dialog is dismiss-only copy.

## 2026-07-30 Lesson warm-up is a 60s overlay once per lesson

- **Decision:** `LessonWarmUp` shows for 60s after a lesson starts on `/lesson`; Skip or expiry marks `sessionStorage` so reload does not re-show for that lesson id.
- **Reason:** Feature 27 — brief settle time before the class treats the lesson as running.
- **Note:** Overlay only; does not block Control.
## 2026-07-30 Control reuses the camera-wall lesson timer

- **Decision:** Control mounts `LessonTimerBanner` under `LessonStrip` — local countdown only, same component as `/walls/cameras`.
- **Reason:** Feature 26 — Teachers watching Control need the period clock without opening Cameras.
- **Note:** End-period prompt is a separate feature that hooks `onExpire`.

## 2026-07-30 Attention queue dock on Control

- **Decision:** Add `ControlAttentionQueue` beneath the Attention bar — the full
  `alertQueue` worst-first as clickable rows. Click selects the matching strip and scrolls
  it into view; the bar still shows one Alert at a time with Acknowledge.
- **Reason:** Feature 25 — Teachers working several alerts need to jump between strips
  without re-finding them in board order. The dock reuses queue ordering and presentation;
  strips stay in `boardOrder` (deliberate position #1).
- **Note:** Hide the dock at zero queue length — the bar's count and reassuring sentence
  already cover the empty case.
## 2026-07-30 Battery time budget uses charge × 12 minutes

- **Decision:** Control flight strips show estimated flight minutes as `batteryFraction × 12`,
  rounded to whole minutes (`about N min left`). No discharge slope — a classroom rule of
  thumb only. Low-budget threshold for warnings is `< 20%` charge (~2.4 min).
- **Reason:** Feature 24 — Teachers need a quick time budget beside charge without vitals
  history; the vitals endurance forecast stays on Drone detail where slope data exists.
- **Note:** Helper lives in `web/lib/battery-budget.ts`.

## 2026-07-30 Lesson timer on camera wall is local state

- **Decision:** `LessonTimerBanner` on `/walls/cameras` holds countdown in React state only.
- **Reason:** Feature 22.
- **Note:** Persist later; Control timer is a separate feature.
## 2026-07-30 Walls TV mode toggles Cameras and Status

- **Decision:** `/walls/tv` mounts CameraWall or StatusWall with a toggle; Exit TV → `/walls`. No Settings link on this surface.
- **Reason:** Feature 21.
- **Note:** SiteHeader still present via app layout.

## 2026-07-30 End-lesson landed wall at `/walls/landed`

- **Decision:** `/walls/landed` renders `LandedWall` — one linked tile per Drone in board
  order. Green (`success`) when `airborne` is false, red (`destructive`) when still airborne.
  Summary: `N landed · M still flying`. Click → `/drone?id=`. Empty Fleet → “Waiting for the
  Fleet.”
- **Reason:** Feature 19 — end-of-lesson glance at who is down without Control.
- **Note:** Pure filter in `landed-wall.ts`; hub link deferred — do not edit `WallsHub`
  until hub sync.
## 2026-07-30 Camera wall names the assigned student when the Logbook has one

- **Decision:** Camera wall tiles use `studentOf` for the headline and simulated-feed label;
  unassigned tiles keep the Drone callsign only — no placeholder.
- **Reason:** Feature 20 — Teachers scanning six feeds need who's flying, not another row of
  "Drone N".
- **Follow-up:** When assignment is missing, the tile stays drone-named; assignment still
  happens on Control / Students, not on the wall.
## 2026-07-30 Scope camera filmstrip under Control scope

- **Decision:** Control's "Where everything is" section adds a horizontal filmstrip of
  `CameraTile` thumbs below `Scope`. Board order, watch-only; click opens `CameraSlide`.
  Selected scope mark sets `aria-pressed` on the matching thumb.
- **Reason:** Feature 15 — glance every fitted camera without leaving the scope.
- **Note:** Lives on `/control` (Tower redirects there). Reuses `CameraTile`; no new Commands.

## 2026-07-30 Spotlight wall is one CameraPane plus thumb row

- **Decision:** /walls/spotlight shows one large CameraPane; thumbnails switch focus by drone id in local state.
- **Reason:** Feature 17 — class demo focus without leaving Walls.
- **Note:** Reuses CameraPane; no Telemetry stream URLs.
## 2026-07-30 Dual watch uses query params a/b for CameraPane pair

- **Decision:** /walls/dual mounts two CameraPanes. `?a=` / `?b=` select drone ids; missing params use the first two Fleet Drones in board order.
- **Reason:** Feature 16 — compare two feeds without crowding Control.
- **Note:** Full CameraPane (sim Start/Stop) inside each pane; no new Commands.
## 2026-07-30 Detection wall shows em dash until counts are shared

- **Decision:** Tiles show —; counts stay in CameraPane for now.
- **Reason:** Feature 14.
## 2026-07-30 QR pad wall ships Not seen until CameraPane sightings are shared

- **Decision:** Tiles show Not seen; no Telemetry write.
- **Reason:** Feature 13.
## 2026-07-30 Landing watch focuses descending and auto-landing phases

- **Decision:** Prefer `descending` / `auto-landing` / low airborne; else all with height. Click `/drone?id=`.
- **Reason:** Feature 12.
- **Note:** Read-only.


## 2026-07-30 Landing watch wall at `/walls/landing`

- **Decision:** `/walls/landing` renders `LandingWatch` — one linked tile per Drone in board
  order when nothing is landing; when any Drone has phase `descending` or `auto-landing`
  (or airborne with vertical rate below the vitals deadband), the wall **narrows to those
  tiles only**. Tile body: name, phase label when focused, airborne state, aligned height.
  Summary: `N landing`. Click → `/drone?id=`. Empty Fleet → “Waiting for the Fleet.”
- **Reason:** Feature 12 of classroom walls — whole-class landing glance without Control.
- **Note:** Pure filter in `landing-wall.ts`; hub link deferred — do not edit `WallsHub`
  until hub sync.
## 2026-07-30 Proximity wall at `/walls/proximity`

- **Decision:** `/walls/proximity` renders `ProximityWall` — one linked tile per unique pair
  of airborne Drones closer than **`SEPARATION_WARNING_M` (1.5 m)** from vitals, deduped the
  same way Scope draws conflict lines. Summary: `N close pairs`; distance readout uses one
  decimal and ` m apart`. Click → `/drone?id=` on the lexicographically first id in the
  pair. Empty when all clear. Display-only.
- **Reason:** Feature 11 proximity risk wall — whole-class separation glance without Scope.
- **Note:** Pair logic lives in `proximity-wall.ts`; hub link syncs in a later wave.
## 2026-07-30 Lost-link siren is visual pulse on Walls, not audio

- **Decision:** `LostLinkSiren` mounts in `WallsShell` when any vitals entry is Offline,
  `no-contact`, or has a `no-response` alert. Uses `role="alert"` and
  `motion-safe:animate-pulse` (no compulsory motion). No audio in this feature.
- **Reason:** Owner feature 10 — Teacher glance when a craft goes quiet mid-lesson.
- **Note:** Does not change ConnectionBanner (board↔ground-station); this is per-Drone link.
## 2026-07-30 Height wall uses 3 m classroom ceiling default

- **Decision:** `/walls/height` compares each reported `altitudeM` against
  **`CLASSROOM_CEILING_M = 3`** in `height-wall.ts`. At or below 3 m is normal; above
  highlights the tile and counts in “N over ceiling”. No shared ceiling constant existed
  elsewhere — Scope uses an adaptive ladder, and ADR-0016’s “3 m ceiling” is illustrative
  only.
- **Reason:** Feature 9 height wall — whole-class height comparison with one teaching
  default until a room model lands.
- **Note:** Readouts use one decimal and a fixed ` m` suffix for column alignment; click
  → `/drone?id=`. Hub link syncs in a later wave.
## 2026-07-30 Last Contact wall at `/walls/heartbeat`

- **Decision:** `/walls/heartbeat` renders `HeartbeatWall` — one linked tile per Drone in
  board order (`vitals`), read-only. Tile body: name plus a single dot — filled (`bg-ink`)
  when `lastContact` is set and the Drone is not Stale, hollow (`border-stale`) otherwise.
  Summary line: `N stale`. Click → `/drone?id=`. Teacher-facing title **Last Contact**;
  route keeps `heartbeat` internally. Empty Fleet → “Waiting for the Fleet.”
- **Reason:** Feature 8 of classroom walls — whole-class link liveness at a glance without
  Status noise.
- **Note:** Alive logic in `heartbeat-wall.ts`; aria-label carries responding/stale for
  screen readers because the dot alone would violate ADR-0004.
## 2026-07-30 Fault mosaic reorders trouble to the front

- **Decision:** `/walls/faults` renders `FaultMosaic` — one linked tile per Drone. Unlike
  Control strips and the Status wall, **priority tiles sort first**: stale silence, Fault
  status, latched emergency, or a `fault` / `emergency-stop` alert. Within each group,
  board order is preserved. Summary line: `N troubled`. Tile body: name, `StatusBadge`, fault
  reason when Telemetry carries one, stale “Link gone quiet” otherwise, response age. Fault →
  `border-status-fault`; emergency → `border-2 border-status-fault`. Non-priority tiles stay
  visible but slightly muted. Click → `/drone?id=`.
- **Reason:** Feature 7 of classroom walls — a mosaic view where trouble is never buried
  behind healthy Drones.
- **Note:** Pure sort in `fault-mosaic.ts`; hub link lands in a later sync commit.
## 2026-07-30 Attention wall — loud trouble, quiet nominal

- **Decision:** `/walls/attention` renders `AttentionWall` — one linked tile per Drone in
  board order. **Troubled** when any of: `status === Fault`, `phase === emergency`,
  `drone.stale`, or an unacknowledged vitals alert. Troubled tiles use `text-tile-name`,
  show the worst pending alert (or a fault/emergency/stale fallback), and reuse Status
  wall border accents. **Nominal** tiles are `text-label text-ink-muted` with callsign
  only. Summary: `N need you`. Click → `/drone?id=`.
- **Reason:** Feature 6 of classroom walls — whole-class triage without Control's one-at-a-time
  attention bar.
- **Note:** Acknowledgement only gates alert kinds; fault/emergency/stale stay loud. Hub
  link deferred — do not edit `WallsHub` until hub sync.

## 2026-07-30 Battery wall critical threshold matches board usable charge

- **Decision:** A tile is **critical** when `batteryFraction` is below
  `DEFAULT_THRESHOLDS.usableBatteryFraction` (30%) — the same number vitals uses for
  `battery-low` and the ground station uses for Not Ready. No separate 20% wall threshold.
- **Reason:** Owner battery wall spec — one low-battery idea across board and walls.
- **Note:** Reuses `BatteryLevel` with `low={critical}`; summary line is “N critical”.

## 2026-07-30 Remedial queue on Control and Lesson

- **Decision:** **Remedial queue** lives in the browser Logbook (`remedialQueue`). When a
  lesson closes, Drones with **fault**-severity incidents are merged in once each. Control
  and `/lesson` render a minimal linked list; **Done** dismisses locally — no Command
  (ADR-0011).
- **Reason:** Classroom follow-up after incidents without another screen to maintain.
- **Note:** Attention-severity incidents stay off the queue unless a Teacher adds them later.

## 2026-07-30 Pre-flight checklist on `/lesson`

- **Decision:** Before start, `/lesson` shows a **Pre-flight check** section: summary
  `N ready · M not ready` and a list of not-ready Drones with Ready-wall labels and glyphs.
  Reuses `readyBoardLabel`, `readyBoardSummary`, and `READY_BOARD_PRESENTATION` from
  `ready-mapping.ts` — same mapping as `/walls/ready`, no second ruleset. `readyAtStart`
  on the lesson record uses that ready count. Zero ready shows calm copy near Start; Start
  stays enabled (E7).
- **Reason:** Feature 23 — Teachers see pre-flight readiness on the lesson workflow without
  opening the Ready wall.
- **Note:** Serviceable headline and “Standing in the way” stay on contract Status; the
  checklist is the vitals-based Ready-board view.

## 2026-07-30 Ready wall maps vitals to four pre-flight labels

- **Decision:** `/walls/ready` derives each tile from existing `DroneVitals` and Status
  only — no new Telemetry fields. Four labels: **Ready**, **Not ready**, **Offline**,
  **Fault**. Summary line: `N ready · M not ready`; Offline, Fault, and Not ready share
  the second count.
- **Mapping (first match wins):**

  | Condition | Label |
  | --- | --- |
  | `status === Offline`, `phase === no-contact`, or a `no-response` alert | Offline |
  | `status === Fault`, `phase === emergency`, or a `fault` / `emergency-stop` alert | Fault |
  | `status === Ready` and not airborne | Ready |
  | otherwise (Not Ready, Flying, airborne Ready, etc.) | Not ready |

- **Reason:** Owner ready-board plan — whole-class pre-flight glance without Commands.
- **Note:** Pure function in `ready-mapping.ts`; tiles link to `/drone?id=` like Status wall.

## 2026-07-30 Status wall tiles link to Drone detail

- **Decision:** `/walls/status` renders `StatusWall` — one linked tile per Drone in board
  order (`vitals`), read-only. Tile body: name, `StatusBadge`, charge %, height when
  `altitudeM` is on vitals, response age with “Last response …” when stale. Fault →
  `border-status-fault`; latched emergency → `border-2 border-status-fault`. Click →
  `/drone?id=`. Empty Fleet → “Waiting for the Fleet.”
- **Reason:** Feature 3 of classroom walls — whole-class status at a glance without Control.
- **Note:** Battery subroute stays on placeholder until its feature lands.

## 2026-07-30 Camera wall freeze on `/walls/cameras`

- **Decision:** **Freeze wall** snapshots vitals order and per-tile drone/camera labels on
  the camera wall only. Telemetry, ScenarioControls, and CameraSlide stay live — freeze is a
  display pause for comparing a class moment, not a sim or link stop. **Resume updates**
  drops the snapshot and re-renders from the current Fleet.
- **Reason:** Feature 18 — Teachers need a still frame of every camera label without
  stopping the Fleet behind the wall.
- **Note:** No backend or Telemetry flag; UI state in `CameraWall` only.

## 2026-07-30 Camera wall at `/walls/cameras`

- **Decision:** Cameras sub-wall shows one compact watch-only tile per Drone in board order
  (`CameraTile` + `WallGrid`). Tiles reuse stream-map / sim rules from CameraPane without
  YOLO, QR, or Start/Stop on the tile. Click opens existing `CameraSlide`. Offline or
  missing Telemetry uses board connection language (Status badge, “No Telemetry yet”).
- **Reason:** Feature 2 of classroom walls — whole-class camera glance without crowding Control.
- **Note:** Full CameraPane behaviour stays in the slide only.

## 2026-07-30 Classroom Walls live under `/walls` after Control in SiteNav

- **Decision:** Sixth workflow destination is **Walls** (`/walls`), placed immediately after
  Control. Sub-walls are `/walls/*`. Shared `WallsShell` + `WallGrid`; hub lists every
  wall as it lands. Nav active state matches `/walls` and any `/walls/…` child. Camera-like
  tiles open CameraSlide; status-like tiles go to `/drone?id=`. Instrument frame (same
  family as Control).
- **Reason:** Owner classroom-walls plan — whole-class glance without crowding Control.
- **Note:** Feature 1 is shell + placeholders only; feeds and vitals arrive per wall.

## 2026-07-30 Trainer Drones Model/Created stay optional behind Add details

- **Decision:** Settings Trainer Drones lists name + id with a quiet summary; Model and
  Created open only via **Add details** / **Edit details**. Empty values are valid; saving
  both blank removes the inventory row. Teaching never depends on model.
- **Reason:** Owner #80 — MODEL must not feel mandatory.
- **Note:** Still Logbook-only (ADR-0005); not Telemetry.

## 2026-07-30 Header logo navigates to Control

- **Decision:** The brand mark (logo asset / wordmark fallback) is a `<Link href="/control">`
  with accessible name “… go to Control”. The “Flight Deck” product title beside the mark
  is **not** in the link — it is identity, not the logo cluster the owner highlighted.
- **Reason:** Owner #96 — click logo → teaching surface (Control), not Fleet/home.
- **Note:** Min-height 2.75rem on `.brand-link` for touch without scaling the mark.

## 2026-07-30 Dual-write Logbook: local first, Vercel Blob copy with shared secret

- **Decision:** Every Logbook save writes **localStorage first**, then debounced PUT to
  `/api/logbook` when a sync secret is set. Cloud store is private **Vercel Blob** via a
  root Serverless Function (not Next route handlers). Auth: `LOGBOOK_SYNC_SECRET` /
  Settings secret. v1 **last-write-wins** on `revisedAt` / `updatedAt`. ADR-0015.
- **Reason:** Owner #93 / plan #83 — Vercel preview should show Students/Reports, offline
  classroom must keep working.
- **Note:** Needs `BLOB_READ_WRITE_TOKEN` + `LOGBOOK_SYNC_SECRET` on Vercel. Telemetry
  never carries Logbook rows.

## 2026-07-29 Reports primary action is Download PDF

- **Decision:** Reports’ primary control is **Download PDF** (`jspdf` in the browser) so the
  file has no browser Headers/footers (URL/clock). **Print** remains secondary. No
  “Printed at” stamp on the PDF (optional omit).
- **Reason:** Owner #92 — Teachers should not fight print-dialog chrome for a take-home copy.
- **Note:** Still client-side / static export compatible (ADR-0005). No server PDF route.

## 2026-07-29 Every classroom sim Drone has a camera

- **Decision:** `SimulatedTelemetrySource` sets `hasCamera: true` for every classroom
  registration (owner option B / #91). “No camera fitted” remains for Telemetry that omits
  `camera` (hardware / fixtures).
- **Reason:** Odd-index craft without cameras confused Teachers on the default sim Fleet.
- **Note:** Rangefinder and auto-land still vary by index for sensor-absence demos.

## 2026-07-29 Front/Side coincident piles stack labels vertically

- **Decision:** Elevation Scope labels for craft that share one spot (same Front column /
  height) use a rem **vertical stack** away from the mark (`nudgeYRem`), not only the
  horizontal stagger from #61. Grounded piles stay **above** the mark. The drawing box
  uses `overflow-hidden` so names never paint into the “Filled = flying” figcaption.
- **Reason:** Owner #86 — Front still showed double-printed names (e.g. Drone 8) when marks
  stacked; 1 rem horizontal was not enough for “Drone N”.
- **Note:** Top-down placement unchanged. Marks stay on the projected point (ADR-0014).

## 2026-07-29 Settings Classroom setup is Sim vs Radio (no hardware Commands)

- **Decision:** Settings **Classroom setup** lets the boss prefer **Simulator** (default,
  Commands work) or **Radio (MAVLink)** without editing `.env`. Preference lives in
  `ground-station/classroom-source.json` (gitignored); `GET`/`PUT` `/api/classroom-setup` on
  the ground station. Changing path requires restarting the ground-station window (launcher).
  `TELEMETRY_SOURCE` still overrides for developers. Radio remains **monitoring only** —
  no hardware `CommandableSource` (ADR-0011).
- **Reason:** Owner #76 / #88 — zero-coding Sim vs Radio copy + status after #75 launcher.
- **Note:** Vercel demonstration Fleet explains itself; Radio needs :4321 on the laptop.

## 2026-07-29 Classroom start is a Windows double-click launcher

- **Decision:** Boss/Teacher starts the ground station with **`Start TechTech Flight.bat`**
  at the repo root (install if needed, build `web/out` once if missing, start
  `ground-station` on **:4321**, open the board). No terminal typing for the normal path.
  Default telemetry remains the **Simulator**. **MAVLink radio** stays opt-in via
  `TELEMETRY_SOURCE=mavlink` and is **monitoring only** (ADR-0011) — not a zero-coding
  CommandableSource.
- **Reason:** Owner #75 — “cara nyalain localhost 4321” must not require npm/IDE.
- **Note:** Unreachable banner points at the `.bat`. Vercel preview needs no :4321
  (`NEXT_PUBLIC_DEMO_ONLY`).

## 2026-07-30 Detect wall tallies come from the browser detector, not Telemetry

- **Decision:** `/walls/detect` runs the same pluggable `ObjectDetector` as `CameraPane`, but
  only for **simulated streaming** cameras and only when `exposesCounts !== false`. Tiles
  show `detect().length`; idle cameras, hardware streams, and detectors that set
  `exposesCounts: false` show **"—"**. Counts never go on the Telemetry wire. Tiles link to
  `/drone?id=` (not CameraSlide). The wall is not listed on the Walls hub in this PR.
- **Reason:** Feature #14 — Teachers need a class-wide glance at YOLO tallies without opening
  every camera pane. Reusing the detector interface avoids a second model load path.
- **Note:** Hardware school streams could reuse the same loop when the map supplies pixels;
  until then those tiles stay unavailable. A future hub entry can land separately.

## 2026-07-29 In-browser detection is YOLOv8n ONNX (not napkin YOLOv12 yet)

- **Decision:** Default `ObjectDetector` loads **YOLOv8n** COCO via `onnxruntime-web`
  (`web/lib/yolo-onnx-detector.ts`). Weights at `/models/yolov8n.onnx` (gitignored; fetch
  script). Wasm from jsDelivr. Sim Start camera uses **getUserMedia** when allowed so the
  model has real pixels; CSS sim + demo detector if denied / jsdom / load failure. UI says
  **YOLOv8n**, never claims YOLOv12 until those weights are wired.
- **Reason:** Owner wants person/object detection on the board (#69). YOLOv8n is the
  practical classroom-sized ONNX; napkin “YOLOv12” waits on a publishable browser export.
- **Note:** Detections stay app-side — never on Telemetry. Swap path: drop a newer ONNX in
  `public/models/` and point `MODEL_URL`.

## 2026-07-29 Teacher find-path is this laptop’s Logbook screens

- **Decision:** Canonical Trainer data lives in this browser Logbook on the classroom
  laptop. Teachers find it on: **Students** (roster), **Settings** (trainer Drones),
  **Lesson** (prep / LessonDrone + LessonAssignment), **Reports** (finished Lesson records).
  Control/Fleet strips show **names** only. Vercel is preview-only — not the school DB.
- **Reason:** Owner #74 — “nanti Teachers nyari datanya gimana?” Answer is the board on
  this laptop, not a cloud admin.
- **Note:** No Export/Import restore here (ADR-0012). Pointer: issue #74.

## 2026-07-29 Camera opens from Control as a large centered dialog

- **Decision:** Control strips (and the scope selection dock) offer a **Camera** control that
  opens a **centered** Radix Dialog at `w-[min(42rem,92vw)]` hosting `CameraPane` (kept
  name `CameraSlide`). Fleet detail offers the same entry. Camera is not a Command — outside
  `CommandRow` (C9). Escape / Close dismisses. Stream map stays env/IT only — no Teacher
  Settings form (#66).
- **Reason:** Owner — teaching wants click → camera on Control (#59); right rail felt too
  small (#67).
- **Note:** No Telemetry URL. Sim Start/Stop remain ScenarioControls inside the pane.

## 2026-07-29 Lesson and Student IDs are assigned by the board

- **Decision:** `registerStudent(name)` → `S-0001…`; `createTrainerLesson(name)` → `L-0001…`.
  Create UIs expose name only; id is read-only after create. Drone attachment uses Fleet
  `droneId` (no Teacher-typed second key).
- **Reason:** Owner #58 — forcing Lesson/Student ID into a form is wrong.
- **Note:** `upsertStudent` / `upsertTrainerLesson` remain for tests and migration; legacy
  `stu-…` ids do not advance the serial counter.

## 2026-07-29 Scope names stay above marks; close ones nudge sideways

- **Decision:** Top-down Scope labels are always **above** the mark. When marks sit within
  ~14% of the window of each other, names get a horizontal rem stagger (cluster fan-out)
  instead of the old above/below alternation. Elevation keeps "toward the middle of the
  box" vertically, with the same horizontal stagger. Names are never omitted.
- **Reason:** Owner #61 — put the name above the drone, one-by-one; do not let them crash
  into each other. Alternating below contradicted "above" and still collided when a row
  closed up.
- **Note:** Logic in `scopeLabelPlacements`; Mark keeps the geometric point fixed and only
  offsets the label. Scope geometry / ADR-0014 window unchanged.

## 2026-07-29 Curriculum exercise copy is "Stay still in the air"

- **Decision:** Lesson planner exercise placeholder (and DESIGN § wireframe example) is
  **Stay still in the air**, not "Hover and hold" / "Hover practice".
- **Reason:** Owner Phase 2 — the old chip read like Control’s hover/hold Command.
  Curriculum task ≠ kind `hold`.
- **Note:** Do not rename the Control strip label or wire `hold`. Teachers may still type
  any exercise name; this is catalog/hint copy only.

## 2026-07-30 Pad wall ships read-only with an honest no-signal tile

- **Decision:** `/walls/pads` shows landing-pad QR **seen / not seen** per Drone using the
  same `landingTargetPresentation` copy as `CameraPane`. Scan gate matches the camera pane:
  simulated feed with `camera.streaming` only. Idle sim, no camera, and hardware (`scenarios
  === null`) show **—**; a streaming sim picture with no landing QR shows **Not seen**.
  Tiles link to `/drone?id=`; nothing writes Telemetry.
- **Reason:** Feature #13 — classroom glance at pad visibility without opening every camera.
  Hardware school streams still lack a frame scan on the wall (#50 follow-up).
- **Follow-up:** When mapped school `<video>` pixels are scannable on the wall, reuse
  `createUrlScanner` / stream-frame capture — same display-first rule, no Telemetry write.

## 2026-07-29 QR on camera is a landing target (display-first)

- **Decision:** Camera QR means **where to land**, not inventory. Decode via a small
  `QrDecoder` seam (jsQR). Payloads `ttf-land:<id>` or `ttf-land:<id>;east=<m>;north=<m>`
  map into the classroom frame; other codes stay quiet. Result is shown on `CameraPane`
  only — never written into Telemetry. Sim may offer an explicit **Place at landing pad
  (demo)** that calls `ScenarioControls.setPosition`; hardware (`scenarios === null`) never
  gets that control (C9). No auto pose write.
- **Reason:** Owner clarification on #51 — landing targeting. Silent Telemetry overwrite on
  a live airframe would be dangerous and out of scope.
- **Note:** Sim feed scans a static fixture (`/qr/landing-pad-a.png`) when school stream
  pixels are not the picture source. YOLO (#49) and Trainer DB (#48) untouched.

## 2026-07-29 School camera streams are an env/IT map + native `<video>`

- **Decision:** `droneId → http(s) URL` lives outside Telemetry
  (`techtechflight:camera-stream-map` localStorage), seeded by optional
  `NEXT_PUBLIC_CAMERA_STREAM_MAP` JSON when storage is absent. No Teacher Settings form.
  `CameraPane` plays a mapped URL with a native `<video controls playsInline muted
  autoPlay>` when hardware Telemetry says `streaming` and a map entry exists. No hls.js —
  progressive HTTP(S) broadly; Safari-native HLS (`.m3u8`) where the browser supports it.
  Simulated Fleets keep labeled demo pixels and ignore the map. URLs sanitized to absolute
  http(s) without credentials.
- **Reason:** REQUIREMENTS forbid stream URLs in Telemetry (#50). School IT can bake a seed
  at deploy. Native `<video>` avoids a decoder dependency until a classroom proves Chromium
  HLS is required.
- **Note:** Unmapped hardware streaming keeps the honest “needs a school stream map” notice.
  No fake Start on hardware. WebRTC / hls.js remain follow-ups if schools need them.

## 2026-07-29 Camera object detection is a pluggable app-side detector (demo first)

- **Decision:** `CameraPane` runs an `ObjectDetector` overlay only while the **simulated**
  feed is streaming. Interface lives in `web/lib/object-detection.ts`. This PR ships a
  **deterministic demo detector** (honest UI: "Demo detector (not a loaded model)") — not
  YOLOv12. Telemetry stays `camera?: { streaming }` only; no boxes / URL on the wire.
  Detector failure → empty overlay, pane stays up.
- **Reason:** Owner path is live feed → AI (YOLOv12), but the sim feed is CSS pixels and
  weights are not in the repo. Ship the overlay loop + swap point first (#49); do not claim
  a model family that is not loaded.
- **Follow-up:** Swap to a newer COCO ONNX (napkin “YOLOv12”) by dropping weights in
  `web/public/models/` and pointing `MODEL_URL` — the board path is already ONNX (#69).
  School-stream pixels can feed the same detector when the map supplies a `<video>`.
  Then rename `displayName` / drop `demo: true` on that path.
- **Alternatives considered:** Bundling a tiny real model now (no useful pixels on the CSS
  feed); putting detections on Telemetry (REQUIREMENTS forbid stream URL; same injection
  class for payload bloat).

## 2026-07-29 Trainer DB is 3NF-shaped Logbook relations, not the napkin

- **Decision:** Browser Logbook gains `roster` (Student: studentId + name), `trainerDrones`
  (droneId, model, createdDate), `trainerLessons`, `lessonDrones`, and `lessonAssignments`
  (lessonId + droneId → studentId). Live `students` stores studentId after write; `studentOf`
  always returns the name for strips (D5). LessonRecord.assignments still captures **names**
  at start (G6). Legacy name-only `roll` / `students` load unchanged; migrate forward on write
  only. Napkin example IDs and nested `drones[]` are illustration — Lesson↔Drone is a
  relation, not a forever belongs-To.
- **Reason:** Owner photo + #48 — classroom identity needs proper related records in the
  browser (ADR-0005); Telemetry must not carry trainer rows.
- **Note:** Minimal Students / Settings / Lesson-prep UI. Control layout untouched. YOLO,
  stream map, and QR stay other tickets.

## 2026-07-29 Control command Hold is labelled Hover

- **Decision:** Teacher-facing strip/dock label and C4 receipt word is **Hover**. Command
  kind remains `hold` on the wire.
- **Reason:** Owner notes (#52 / epic #47) — “stay hover immediately”.
- **Note:** Do not rename `CommandKind` without a separate contract pass.

## 2026-07-29 Lesson/Student Logbook is this browser; Vercel is a separate preview

- **Decision:** Teacher-facing copy on Lesson and Students states that records stay in
  **this browser on this laptop**. Localhost (classroom) is the working store. Vercel is
  preview-only — a different origin with its own empty `localStorage` Logbook. No server
  Postgres; ADR-0005 stands.
- **Reason:** Owner confusion (#68) — boss uses localhost for real lessons; Vercel is so
  they can preview online. Data must not be assumed to follow between the two.
- **Note:** Export/Import stay withdrawn. Cloud sync is out of scope.
## 2026-07-29 Per-Drone camera pane is Telemetry boolean + sim pixels

- **Decision:** Drone detail mounts `CameraPane`. Telemetry stays `camera?: { streaming }`.
  Simulated picture is app-owned canvas; Start/Stop are `ScenarioControls`, never Commands
  (C9). Hardware (`scenarios === null`) shows idle/streaming copy only.
- **Reason:** Owner Phase 1 — open one Drone and see its camera; YOLO/QR/DB later. REQUIREMENTS
  forbid a stream URL in Telemetry.
- **Note:** School stream map landed in #50 (env/IT + native `<video>`, no Settings form).
  Overlay detection is #49 — still not on the Telemetry wire. Even-index classroom craft
  already have `hasCamera` in the simulator.

## 2026-07-28 Stop is a single press (owner overrides C8 hold)

- **Decision:** Emergency **Stop** is an ordinary click — no `GuardedButton` hold, no
  "Press again to stop". Release stop behaviour unchanged.
- **Reason:** Owner — hold/confirm felt awkward; classroom needs the cut immediately.
- **Note:** Supersedes DESIGN §4.5 press-and-hold reading of C8 for this product. Accidental
  strip presses remain a residual risk; strip order + fault styling still separate Stop.

## 2026-07-28 Full-screen Scope docks Commands for the selected mark

- **Decision:** Pass a `selectedPanel` into `Scope`; when expanded and a mark is selected,
  show Land / Hold / Stop (same `CommandRow` as the strip) in a bottom dock. Reports omits
  the panel.
- **Reason:** Owner feedback — selecting on the graph works, but fullscreen covers Every
  Drone so Commands were unreachable.
- **Note:** Overlay still temporary (ADR-0014 / #31); Clear or re-tap mark deselects.

## 2026-07-28 Emergency stop has no "Stop — done" receipt on the strip

- **Decision:** When Telemetry shows the emergency latch, drop the command-tracker line for
  that Stop (forget on satisfied; never render done/held receipt). Keep Land/Hold receipts.
- **Reason:** Owner — "Stop — done" stuck beside Release stop and read as a second broken
  control. Latch + alert already say the cut held.
- **Note:** Brief Stop — sent / waiting before latch may still flash; that is C4, not the
  stuck done line.

## 2026-07-28 Reports print forces paper tokens; browser chrome is off-dialog

- **Decision:** `@media print` resets light colour tokens on `:root` and `[data-theme='dark']`,
  breaks only on `.lesson-report`, and the Print control stamps printed-at + sets the
  document title. Browser Headers and footers (URL, clock) stay a Teacher toggle in the
  print dialog — not something CSS can own.
- **Reason:** Dark theme left semantic ink light-on-white (blank preview); blanket
  `break-inside: avoid` on `section`/`li` emptied page 1. G3 still wants a usable A4 sheet.
- **Note:** History stays `print-hide`; Lessons + recurring defects print.

## 2026-07-28 Strip freespace is the response column, not charge

- **Decision:** Control Every Drone list uses `grid-cols-[auto_auto_auto_auto_1fr]` — Name,
  Student, height, charge are `auto`; response takes `1fr` and is `text-right`. Stop stays
  separated from Land/Hold via `ml-auto`.
- **Reason:** `1fr` on charge left-aligned text in a stretched column → cavern before
  Response (#41 / owner screenshot).
- **Note:** Five-cell order and boardOrder (#27) unchanged. Plan:
  `docs/plans/2026-07-28-flight-strip-tighten.md`.

## 2026-07-28 Training scenarios are Settings runners, not strip Commands

- **Decision:** Named T-scenarios on `ScenarioControls` (+ `placeNear` / `setAltitude` /
  `setPosition` / e-stop / `link` / `resetClassroom`), UI in Settings
  `TrainingScenariosPanel`. Atomic Demonstration panel stays for ad-hoc triggers.
- **Reason:** Owner bar — kena semua Teacher surfaces. C9 forbids scenario buttons on strips.
- **Note:** T7b available with Front on main (#28). T9/T10 checklist. MAVLink out of scope for #30.

## 2026-07-28 Scope fullscreen is an overlay, not browser Fullscreen API

- **Decision:** Fixed inset overlay on `Scope` for Full screen / Exit + Escape. Do not call
  `requestFullscreen`. Cap (ADR-0014) restored on exit; not persisted.
- **Reason:** Classroom projectors and tablets are flaky with the browser Fullscreen API;
  issue #31 preferred overlay. Opt-in only — strips stay the working surface by default.
- **Note:** Independent of Front (#28); toggle list is whatever Scope already ships.

## 2026-07-28 Front elevation reuses Side's rules on the other floor axis

- **Decision:** Add Scope view `front` — north × altitude — with ADR-0017. Factor
  `isElevation()` for shared ceiling / ground / heightless / aspect behaviour.
- **Reason:** Side stacks Drones that share an easting; Front separates them. Owner asked
  for the missing elevation without a second box (ADR-0014).
- **Note:** ADR-0016 "any third view" superseded in writing. Conflict lines still top-down
  only.

## 2026-07-28 Emergency stop CTA is just Stop

- **Decision:** Primary strip label is **Stop**, not "Stop immediately". Confirm / hold copy
  unchanged; latched state still **Release stop**.
- **Reason:** Owner — "immediately" is noise on the button.
- **Note:** Follows #32's Release-stop behaviour; only the idle label tightens (#37).

## 2026-07-28 Release stop clears the latch; it is not a Scenario

- **Decision:** After `emergency` phase, replace **Stop** with **Release stop** calling
  `ScenarioControls.resetEmergencyStop` on a simulated Fleet. On hardware
  (`scenarios === null`), keep the control present but disabled with a reason in words.
- **Reason:** A stale Stop CTA after the motors are cut reads as failure. The physical
  counterpart is walking over to release the cut-out — not inventing a fault (C9).
- **Note:** Do not add a `CommandKind` for release (ADR-0011 / no hardware command path).
  Confirm-on-first-press for armed Stop stays.

## 2026-07-28 Control strips follow boardOrder; Attention carries urgency

- **Decision:** Drop `compareStrips` from Control's Every Drone list. Strips use the same
  `FleetState.drones` / `boardOrder` order as Fleet tiles. Keep `alertQueue` worst-first on
  the Attention bar.
- **Reason:** Owner reported the live list as dizzying — rows swapped on every alert tick.
  Numbers updating is fine; positions moving is not. Aligns with deliberate position #1 and
  DESIGN.md §1.1; overrides the old wireframe "worst first" line for strips.
- **Note:** `compareStrips` deleted — it had no other callers. Do not restore worst-first
  strip sort without an ADR arguing against position #1.

## 2026-07-28 Front uses east; Side uses north; fullscreen is an icon

- **Decision:** Swap elevation floor axes — Front horizontal = east, Side = north — so the
  default classroom row spreads on Front. Fullscreen control is icon-only with aria-labels
  (owner override of DESIGN §1.2 for that one control). Expanded overlay centres the
  composition in the viewport.
- **Reason:** Owner defects #38 — text fullscreen label, letterbox hugging the top, Front
  stacking every parked Drone in one place (`northM: 0`).
- **Note:** Do not fake positions in the UI; the mapping changed. Training T7/T7b layouts
  follow the new axes.

## 2026-07-28 Unknown SITL battery is an estimate, not silence

- **Decision:** If a craft is heartbeating but `batteryRemaining` / voltage are absent or
  sentinel (`-1` / `0`), emit Telemetry with `batteryFraction: 1` and `batteryIsEstimate:
  true` rather than withholding the observation.
- **Reason:** Older ArduPilot SITL (e.g. dronekit ArduCopter 3.3) never fills charge; silence
  made Drone 1 read Offline while UDP was live. Contact without a measured cell is still
  contact.
- **Note:** Match decoded messages by registry `clazz`, not `instanceof` — SITL traffic and
  recorded fixtures both need it. Still no `CommandableSource` (ADR-0011).

## 2026-07-28 MAVLink lives in `fleet-adapters/`, opted in by env

- **Decision:** Put the MAVLink `TelemetrySource` in a new `fleet-adapters/` workspace, and
  select it from `ground-station/src/main.ts` only when `TELEMETRY_SOURCE=mavlink`. The
  simulator remains the default. Host/port override via `MAVLINK_HOST` / `MAVLINK_PORT`.
- **Reason:** ADR-0013 forbids `node:dgram` in `fleet-core`. The issue (#15) already named
  the workspace. An env switch keeps every existing demo and the Vercel `DEMO_ONLY` path on
  the simulator without a second binary.
- **Alternatives considered:** Always-on dual source (rejected: two Fleets on one board);
  replace the simulator (rejected: ADR-0001 — the simulator is permanent); put the adapter
  inside `ground-station/` (rejected: the plan and the issue both say `fleet-adapters/`).
- **Note:** System id maps to `CLASSROOM_FLEET` by `boardOrder` so SITL's usual sysid `1`
  lands on Drone 1. Commands stay unavailable by omission of `CommandableSource`.

## 2026-07-28 Living docs follow the merged stack, not the pre-merge world

- **Decision:** Align CLAUDE.md / PLAYBOOK / logbook header / ADR-0014 / DESIGN.md §4.4 with
  what PR #22 shipped (#23). Do not restore the `Grid:` caption or Settings export.
- **Reason:** Agents and reviewers were "fixing" correct code against stale claims.
- **Note:** Showcase register and product-string residual stay on #13 / owner taste — not here.

## 2026-07-28 Register residual is a closed list, not a second sweep

- **Decision:** Finish #13 from the Planner's residual table only — Lesson, Maintenance,
  logbook meanings, Drone cluster, two warm leftovers. Do not re-inventory the whole board.
- **Reason:** Most of W5 already shipped in #22; a second full sweep would re-touch settled
  copy and collide with taste calls (showcase) that Planner parked elsewhere (#23 / owner).
- **Note:** The first miss was a harvest that opened `/drone` without `?id=`. Acceptance is
  grep for the listed "before" strings, not another DOM crawl.

## 2026-07-28 `ScopeWindow` is the projection; `WindowChoice` is the decision

- **Decision:** Rename `RoomExtent` → `ScopeWindow` and `roomExtent()` → `scopeWindow()`, and
  rename the small held record that was already called `ScopeWindow` to `WindowChoice`, on
  the member `.choice`.
- **Reason:** The review asked for `scopeWindow` and noted the name was already taken by the
  held record, so something had to move. The projection object is what every caller touches
  and what the ADR is about, so it gets the honest name; the held record is a decision — how
  big, and where the middle is — and `WindowChoice` says that.
- **Alternatives considered:** `ScopeProjection` for the big one, leaving `ScopeWindow` on
  the small one (rejected: the review asked for `scopeWindow` specifically, and a projection
  is what the object *does* rather than what it *is*); `HeldWindow` for the small one
  (rejected: it is only "held" from the component's point of view — `chooseWindow` returns
  one before anything holds it).
- **Note:** No user-facing string changed except the `aria-label`, which is finding 4 of the
  same review and landed in its own commit.

## 2026-07-28 The two ladder walks in `Scope.tsx` stay separate

- **Decision:** Do not fold `chooseWindow`'s rung walk and `gridStepM`'s step walk into one
  "first that fits, else the fallback" helper, though the review noted the shape twice.
- **Reason:** They stopped being the same shape once the cell floor landed. `chooseWindow`
  skips rungs below the held side, returns a derived `WindowChoice` rather than the rung, and
  falls back to the **last** rung; `gridStepM` skips nothing, returns the step, and falls back
  to the **first**. A shared helper would need a skip predicate, a mapper and a fallback
  selector — three parameters to save two lines each — and it would hide that the two
  fallbacks point in opposite directions, which is the one interesting thing about them.
- **Note:** The cells-across arithmetic *was* folded, into the exported `cellsAcross()`, which
  is what the ladder test now asserts on. `gridStepM` cannot use it without recursing, and
  `gridLines` counts rules over an arbitrary span rather than cells across the window, so
  neither is the same calculation.

## 2026-07-27 The scope's window is reconsidered only when a Drone leaves it

- **Decision:** Keep the held window — size *and* centre — untouched for as long as it
  contains every placed Drone. Recompute only when one has left. When recomputing, centre on
  the midpoint of the Fleet's extent and snap that centre to a multiple of the grid cell.
- **Reason:** "Centred on the Fleet" and "the grid does not move" pull against each other,
  because the Fleet's midpoint moves continuously. Snapping alone would still pan the picture
  by a cell every time the midpoint crossed a half-cell boundary — occasional rather than
  constant, but a whole-Fleet jump is more startling than a slow drift, not less. Gating on
  containment removes it entirely: the window changes when a Drone leaves the frame, which is
  a reason the Teacher can see.
- **Alternatives considered:** Snapping without the containment gate (the pan above);
  centring on the mean position rather than the extent's midpoint (an outlier drags the
  centre less, but the picture then no longer frames the outermost Drones, which is what the
  window is for); re-centring on a timer or with an animation (motion on a board whose
  complaint was motion).
- **Note:** Each rung is tested *after* its own snap rather than picked from the raw reach,
  because snapping can shift the centre by half a cell and push a Drone out of a rung that
  fitted before the snap.

## 2026-07-27 The scope's window is held in a ref, and clamping lives in `project`

- **Decision:** Hold the chosen window side in a `useRef` inside `Scope`, written during
  render, rather than in `useState` adjusted during render or in an effect. And do the
  edge-clamping inside `roomExtent`'s `project()` rather than at each call site.
- **Reason:** The ref write is idempotent — the same props give the same side whether render
  runs once or twice — so the usual objection to writing a ref during render does not apply
  here, and `useState` would have cost a second render pass for a value no one re-renders on.
  Clamping in `project()` means `projectOf`, `percentOf` and the conflict lines all inherit
  it for free; clamping at the call sites would have been four places to forget, and the
  conflict line is the one that would have been forgotten, because it is the only one that
  does not go through a Drone.
- **Alternatives considered:** Recomputing the window freely each render (this is the
  original bug in miniature — a Drone on a rung boundary flips it every tick); lifting the
  held side to `ControlScreen` as state (it is display bookkeeping, not screen state, and
  `HistoryScreen` would have had to carry it too for no reason); clamping in `percentOf`
  only, which leaves an unclamped conflict line drawn off the frame.
- **Note:** The ref means the window resets when the scope unmounts. That is deliberate — a
  Teacher who navigates away and back gets the smallest window that fits, and "never shrinks"
  is a statement about a continuous look at the board, not about the session.

## 2026-07-27 The tests are pinned, and the demonstration stays unpredictable

- **Decision:** Make the demonstration Fleet deterministic **in tests only**, by giving
  `FleetProvider` a `demonstration` prop that forwards `random` and `spontaneous` to
  `LocalFleetLink`. The product passes nothing and keeps `Math.random` with spontaneous
  events on.
- **Reason:** The flakiness came from tests asserting against weather, not from the weather
  being wrong. Spontaneity is a feature of the demonstration — it is the same reason the
  ground station binds scenario keys to its own stdin, so a demonstration never has to wait
  for something to happen. Removing it to make tests pass would have fixed the suite by
  damaging the product.
- **Alternatives considered:** Defaulting `spontaneous` to false and opting the demo *in*
  (quiet by default is the wrong default for the one build anyone looks at); sniffing
  `NODE_ENV` inside `FleetProvider` (production code that behaves differently under test is
  how a suite stops describing the product); mocking the simulator per test (six files each
  inventing their own Fleet, and no longer testing the real derivation path that
  `LocalFleetLink` exists to provide).
- **Note:** The pinned values live in one place, `web/test-support/fleet.ts`, and match
  what `local-fleet-link.test.ts` already used — so the suite has one answer to "what does
  a Drone do when nothing asks it to". It must stay module-level: `FleetProvider` rebuilds
  its link when those options change, so a fresh object per render would restart the Fleet
  on every render.

## 2026-07-24 The commit and branch convention moves to conventional commits

- **Decision:** New work uses `feat:` / `fix:` / `docs:` / `chore:` prefixes, on a branch,
  through a PR. Earlier history keeps its prose subjects.
- **Reason:** Asked for explicitly. `BROWNFIELD.md` prescribes it and the repo previously
  did the opposite — prose subjects committed straight to `main`, no merge commits.
- **Alternatives considered:** Keeping the repo's prose style, which is what its own
  "follow existing patterns" rule would normally imply, and which reads better. Overruled
  deliberately.
- **Consequence:** `git log` has a visible seam at this date. That is the cost.

## 2026-07-24 The page frame is two named frames, not one

- **Decision:** Instrument screens (Fleet, Control) use a wide frame; reading and form
  screens (Lesson, Reports, Students, Settings) use a narrow one. Both are named and
  enforced by a test.
- **Reason:** `docs/DESIGN.md` §3.4 says "one column, centred, with a maximum width" —
  singular. But the Fleet board is the one screen meant to be read across a room, and
  forcing it to the reading width costs it a column at 1440px, making tiles smaller on
  exactly the surface where size is the point. Two named frames still satisfies one
  column, centred, with a stated maximum.
- **Alternatives considered:** One literal frame (costs the board a column); one wide
  frame everywhere (stretches Settings and Students across an unreadable measure); leaving
  the five ad-hoc widths alone.
- **Note:** What was there before was not a considered third option. `FleetBoard`'s
  container predates `docs/DESIGN.md` by eight hours and had no maximum at all; the four
  other widths were each chosen locally afterwards. This replaces sediment, not a design.

## 2026-07-24 The simulation label spans the full sticky layer

- **Decision:** When fixing the flex axis, the label spans the full width of the sticky
  layer rather than matching the floating bar's 1240px maximum.
- **Reason:** `design.md` §9 rejects a badge for this label specifically — "the way a
  persistent indicator fails is that the eye stops seeing it". A full-width strip is a
  statement about the screen; a strip that tracked the bar's width would read as another
  piece of chrome.
- **Alternatives considered:** Matching the bar's width when floating, which reads as one
  object but adds a second animated maximum for no gain in legibility.

## 2026-07-24 npm audit's three highs are left as they are

- **Decision:** Bump `next` 16.2.10 → 16.2.11 and remove three unused dependencies, but do
  **not** run `npm audit fix --force`. The three high advisories it reports are left in place.
- **Reason:** All three are transitive build-time dependencies of Next — `postcss` (CSS
  stringify XSS, sourceMappingURL file read) and `sharp`/libvips (image optimization). This
  build is `output: 'export'` with `images: { unoptimized: true }`: postcss runs only during
  the build and emits static CSS, and sharp is never invoked at all. Neither ships in the
  artifact a School runs. They were present on `main` before this change; the bump did not
  introduce them.
- **Alternatives considered:** `npm audit fix --force`, which resolves to **`next@9.3.3`** —
  a six-major-version downgrade and a rewrite of the whole framework, to patch code that does
  not run. That is precisely the "breaking change / new architecture" the workflow says to
  stop and flag rather than take.
- **Revisit when:** Next ships a release that moves off the flagged postcss/sharp ranges, or
  the board ever stops being a static export. Until then this is noise, not exposure.
