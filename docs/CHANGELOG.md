# Changelog

Newest first. One line per change that a Teacher, or the next person reading this code,
would notice.

## Unreleased

### Added

- **Status wall (`/walls/status`).** Grid of linked tiles — name, Status word, charge, height
  when reported, and response age with a stale hint. Fault and emergency stop use existing
  status-fault borders; empty Fleet keeps the calm waiting line.

- **Classroom Walls hub (`/walls`).** SiteNav “Walls” after Control opens a hub with links
  to Cameras, Status, Ready, and Battery subroutes. Shared `WallsShell` + `WallGrid`
  primitives; subroutes ship placeholder tiles named from the Fleet until each wall lands.
- **Camera wall (`/walls/cameras`).** Grid of watch-only camera tiles in board order; click
  opens CameraSlide with the full CameraPane for that Drone.

### Fixed

- **Front/Side Scope labels no longer double-print when marks stack (#86).** Coincident
  elevation piles stack names vertically in rem above the mark; the drawing box clips so
  “Filled = flying” stays in the footer only.

### Changed

- **Trainer Drones inventory is optional and less crowded (#80).** Model / created date sit
  behind Add details; empty is fine and does not block teaching. Empty save clears the row.
- **Every classroom sim Drone has a camera fitted (#91).** Default simulator no longer
  leaves odd-index craft without `camera` on Telemetry — Teachers never see “No camera
  fitted” on Drone 2/4/6 in the default Fleet. Hardware may still omit the field.

### Added

- **Header logo goes to Control (#96).** The brand mark (and wordmark fallback) is a link to
  `/control` — same teaching surface as the Control nav item. “Flight Deck” product name
  stays outside the link.
- **Dual-write Logbook to Vercel (#93 / #83).** Local save first; debounced cloud copy via
  `/api/logbook` (Blob + shared secret). Vercel board hydrates when cloud is newer.
  ADR-0015. Print/PDF and static classroom export unchanged.
- **Reports Download PDF (#92).** Primary control saves a real PDF (Lessons + recurring
  defects) with no browser Headers/footers. Print stays secondary.
- **Settings Classroom setup — Sim vs Radio (#88).** Plain-language path picker on Settings.
  Simulator (default, Commands) vs Radio/MAVLink (monitoring only, ADR-0011). Preference in
  `ground-station/classroom-source.json`; restart the launcher to apply. No hardware
  `CommandableSource`.
- **Windows classroom launcher (#75).** Double-click `Start TechTech Flight.bat` installs if
  needed, builds the board once when missing, starts the ground station on :4321, and opens
  the board. Unreachable banner tells Teachers to run that file. Default Fleet is the
  Simulator; MAVLink radio remains opt-in monitoring-only (ADR-0011).
- **YOLOv8n person/object detection on the camera (#69).** While the sim camera is on, the
  board prefers the laptop webcam and runs **YOLOv8n** (ONNX, COCO) in the browser — boxes
  for person, chair, bottle, etc. Falls back to the labeled demo detector if weights/wasm
  fail. Telemetry unchanged: `camera.streaming` only. Fetch weights:
  `node scripts/fetch-yolo-model.mjs`.
- **Camera from Control (#59 / #67).** Every Drone strip (and the scope dock / Fleet detail)
  opens a large centered dialog hosting `CameraPane` — watch the feed without leaving the
  teaching surface. Stream URLs stay env/IT (#66). Not a Command (C9).
- **QR landing targets on the camera surface (#51).** When the simulated feed has a picture,
  the board decodes landing-pad QR codes (`ttf-land:…`) and shows where to land. Display-only
  by default — never written into Telemetry. Sim may offer an explicit **Place at landing pad
  (demo)** ScenarioControl; hardware never does. Uses a static fixture until school stream
  pixels land (#50).
- **School camera stream map (#50).** `droneId → http(s) URL` via optional
  `NEXT_PUBLIC_CAMERA_STREAM_MAP` (and localStorage when set). When hardware Telemetry says
  `camera.streaming` and the Drone is mapped, `CameraPane` plays a native `<video>` from
  that map — never from Telemetry. Unmapped hardware keeps the honest notice; simulated
  Fleets still use labeled demo pixels and ignore the map. No Teacher Settings form.
- **Object-detection overlay on the simulated camera feed (#49).** While the sim feed is
  streaming, `CameraPane` draws bounding boxes from a pluggable `ObjectDetector`. Default
  is a labeled demo detector (not YOLOv12 — weights not loaded). Hardware streaming and
  idle/no-camera still show no overlay. Telemetry unchanged: `camera.streaming` only.
- **Trainer DB in the browser Logbook (#48).** Students carry `studentId` + name; trainer
  Drones store model / created date; prepared Lessons use LessonDrone and LessonAssignment
  (studentId-keyed). Strips still show names. Legacy name-only roll still loads; migrate on
  write. Minimal UI on Students, Settings, and Lesson prep — not a Control redesign.
- **Camera pane on Drone detail (#45).** Teachers see a per-aircraft camera surface driven
  by Telemetry `camera.streaming` only — no URL on the wire. Simulated Fleet gets a labeled
  demo feed plus Start/Stop via ScenarioControls (not Commands). Hardware Fleets show state
  without inventing a Start.

### Changed

- **Teachers get a find-path for Logbook data (#74).** Students / Settings / Lesson / Reports
  note that records live on this laptop’s browser Logbook (not Vercel), and name where to
  look for roster, trainer Drones, prep, and finished Lessons.
- **Lesson and Students say where records live (#68).** Plain note: the Logbook stays in
  this browser on this laptop; Vercel is a separate preview with its own empty storage — not
  a shared school database.

### Fixed

- **School camera streams panel stays off Settings (#66).** Teachers do not edit droneId →
  URL there; env/IT map remains for hardware playback.
- **Lesson and Student IDs are system-generated (#58).** Teachers type names only; the board
  assigns `L-…` / `S-…`. Fleet Drones stay pick-by-existing-id. Strips still show names.
- **Scope Drone names stay above each mark without colliding (#61).** Top-down no longer
  alternates names below the mark; packed classroom rows get a horizontal rem stagger so
  labels stay readable. Names are never dropped to anonymous dots.
- **Lesson exercise hint is "Stay still in the air" (#60).** Placeholder / DESIGN wireframe
  no longer say "Hover and hold", which read like the Control command. Control strip and
  kind `hold` unchanged.
- **Control Hold label is Hover (#52).** Teacher-facing button and receipts say **Hover**;
  wire kind stays `hold`. Strips and fullscreen Scope dock updated.
- **Stop is one click — no hold, no second press.** Same as Land/Hold; owner dropped the
  GuardedButton / C8 press-and-hold path for classroom speed. DESIGN §13.2 marked resolved
  so it no longer contradicts §4.5.
- **No more "Stop — done" beside Release stop.** Emergency-stop receipt clears when the latch
  is on Telemetry; Release stop + the critical alert are the lasting signal. Land/Hold still
  get sent/waiting/done.
- **Reports print is a readable paper document in dark theme.** Print forces light colour
  tokens (dark `text-ink` was invisible on white), breaks only on Lesson cards, stamps
  printed-at on the sheet, and tells Teachers to turn off browser Headers and footers so
  the URL and clock do not appear. Print button sets a clean document title before
  `window.print()`.
- **Every Drone strip freespace is the response column (#41).** Head grid is
  `auto_auto_auto_auto_1fr` so charge stays snug after height; Response flush right. Quiet
  strip vertical gap tightened; Land/Hold left, Stop/Release still `ml-auto` (not merged).
- **Scope Front spreads the classroom row (#38).** Elevation floor axes swapped — Front
  horizontal = **east**, Side = **north** — so parked craft at `eastM: 0,1,2…` / `northM: 0`
  separate on Front. ADR-0016/0017 and training T7/T7b follow. (Fullscreen icon-only and
  centred overlay composition landed in the same branch.)
- **Emergency stop label is just Stop.** Dropped "immediately" — the primary CTA is **Stop**;
  after the latch it remains **Release stop**.
- **Stop, then Release stop when latched.** Control strips no longer say "Stop — hold"; after
  Telemetry shows the emergency latch the control becomes **Release stop** on the simulator
  (or present-and-unavailable on a Fleet that cannot release).
- **Control Every Drone strips stay in board order.** Stopped worst-first `compareStrips`
  reshuffling when alerts appear or clear; urgency remains on the Attention bar only.
  DESIGN.md and deliberate position #1 updated so the next reader does not put it back.
- **MAVLink adapter stays live when SITL omits battery.** Match frames by registry class
  (not `instanceof`), and when HEARTBEAT is present but charge is unknown emit
  `batteryFraction: 1` with `batteryIsEstimate: true` so the strip shows contact instead of
  Offline. Verified end-to-end against ArduCopter 3.3 SITL in WSL (UDP 14550).
- **Living docs match the merged board-corrections stack.** CI is acknowledged (no lint
  remains true); the logbook header no longer claims Settings export; ADR-0014 no longer
  requires a live `Grid:` caption; DESIGN.md strip anatomy is five head-row cells.
- **Register residual after PR #22.** Lesson and Maintenance blocking copy, logbook
  service-state meanings, the Drone screen cluster, auto-landing unavailable, and the
  Control acknowledged-alert line — the ADR-0015 "before" strings the first sweep missed
  behind route params and warm leftovers. Key `'watch'` and the five Status words untouched.

### Added

- **Full-screen Scope keeps Commands for the selected mark.** Overlay covers Every Drone
  strips; picking a mark docks Land / Hold / Stop (same row as the strip) at the bottom
  until Cleared or deselected.
- **AED-style training scenarios in Settings.** Named Run/Reset drills (T1–T8, T11–T12) that
  drive the simulated Fleet so every Teacher surface can be exercised without a real aircraft.
  C9: Settings only, never on strips. Catalog and coverage map in
  [`docs/training-scenarios.md`](./training-scenarios.md). T7b / T9 / T10 documented as
  checklist (Front waits on #28; Lesson/Reports are human steps).
- **Full screen on the Control scope.** Opt-in overlay lifts the ADR-0014 cap so the grid can
  fill the viewport; **Exit full screen** or Escape restores the capped layout. View toggle
  stays usable inside; choice is not persisted.
- **The scope has a Front elevation view.** Height against **north**, beside Side (height
  against east). Same box, same ceiling ladder, same heightless-and-named rule; conflict and
  link lines stay top-down only. ADR-0017; supersedes ADR-0016's "any third view". Toggle:
  Top-down · Side · Front. See [ADR-0017](./adr/0017-a-front-view-on-the-scope.md).
- **A MAVLink Telemetry Source, developed against ArduPilot SITL.** New `fleet-adapters/`
  workspace (Node-only — `node:dgram` cannot enter `fleet-core`, ADR-0013). Reads HEARTBEAT,
  SYS_STATUS, BATTERY_STATUS, LOCAL_POSITION_NED, GLOBAL_POSITION_INT and ATTITUDE over UDP
  `127.0.0.1:14550` by default. Fresh `Telemetry` objects per reading; `Clock` injected; no
  `CommandableSource` (ADR-0011) — against real hardware this is monitoring, not control.
  The ground station still defaults to the simulator; `TELEMETRY_SOURCE=mavlink` opts in.
  Adapter tests use recorded frames and a `TestClock` — no socket, no sleeps.
- **The scope has a side view, toggled with the top-down.** The plan view answers *which one
  is that* and *are two about to meet*; it cannot answer **are those two at the same height**,
  and two marks a hand's width apart in plan may be three metres apart vertically and in no
  danger at all. One box, one view, a labelled control to swap — stacking a second picture
  would have undone the 600 px cap the week it landed. A metre up is the same length as a
  metre across, because a stretched vertical axis makes two Drones look separated when they
  are not. Top-down on every load; the choice is not remembered. A Drone that cannot measure
  its height is left out and named rather than drawn on the ground line, which would say it
  had landed when the truth is that it cannot say. See
  [ADR-0016](./adr/0016-a-side-view-on-the-scope.md), including why the ground line is not the
  flight area ADR-0012 defers.
- **Every flight strip carries X, Y and Z.** `X 2.4 m E · Y 1.1 m N · Z 1.7 m`, on its own
  line beneath the head row — never inside it, because §4.4 justifies the whole strip format
  on the eye learning fixed positions and three more numbers in the head row would push charge
  and response age sideways. Each axis carries its letter *and* its direction, so the letters
  are learnable without being the only key. A Drone that has reported no position gets no line
  at all rather than a row of dashes, and a height that was never reported reads `Z not
  reported` rather than `0.0` — an airframe with no barometer and one on the floor are
  different facts (§11.1). At exactly zero no direction is claimed, since 0 m east and 0 m
  west are the same place. The same readout is in the Drone detail dialog. This required
  `docs/DESIGN.md` §1.2 to be **narrowed**: numbers are still not the primary language, and
  position is carried in addition to the instruction rather than instead of it.

### Removed

- **Settings no longer has a records panel or a keyboard panel.** Export, Import and Clear
  everything are withdrawn with the first of them. Notes, service decisions and lesson records
  stay exactly where they were — in one browser profile — but every route to moving them to
  another laptop, or to clearing them short of clearing site data, is gone. That consequence
  was stated and accepted. Settings keeps the ground station block and the scenario controls,
  which `docs/DESIGN.md` §9 requires to live there and nowhere near a Command.
- **The end-of-lesson prompt offering to export a heavy logbook went with them.** It told a
  Teacher their records were getting large and offered the one control that could do something
  about it. With that control deleted the prompt would have been a dead end, and a warning
  with no remedy is worse than no warning.
- **`Ctrl`/`⌘`+K and `Esc` still work, and are now undiscoverable.** The keyboard panel was
  the only place on the board that said they existed. **This is a decision, not an oversight**
  — recorded here so it reads as one at the next accessibility audit. `docs/DESIGN.md` §11.3
  still requires every screen and every Drone to be reachable by keyboard, and they still are;
  what has gone is the documentation of *how*, not the capability.
- **Dead logbook code went with the panels:** `recordsAreHeavy`, `exportLogbook`,
  `recordsSize`, `RECORDS_WARN_BYTES` and `replaceLogbook`, each of which lost its last
  caller. There is no lint here, so an unused export is never flagged and reads as an API the
  next person may build on.

### Changed

- **The whole board speaks in a professional register.** *"3 things need you"* is now *"3
  items require action"*; *"5 of 6 ready to hand out"* is *"5 of 6 serviceable"*; *"Nobody has
  a Drone yet. Hand them out from the Lesson screen."* is *"No Drone is assigned. Assignments
  are made on the Lesson screen."* `CONTEXT.md`'s education-first rule is superseded and says
  so — see [ADR-0015](./adr/0015-a-professional-register.md), which landed before any string
  moved. **What did not change:** every Alert still says what to *do* (§1.2 — the register
  changes the vocabulary, never the grammar of an order), severity is still `Now · Soon ·
  Later`, the classroom nouns are still Teacher, Student, Lesson and Exercise, and the five
  `Status` strings are untouched because they are the type, the wire format and the display
  text at once. The language is English throughout, as it always was; the register moved, not
  the language.
- **The flight strip no longer names a phase.** It read `Level · 2.6 m`, which is the same
  fact twice: a Drone holding 2.6 m is what *Level* means, and the height carries the number
  the word could not. The direction stays — an arrow and a rate answer *is it going up or
  down*, which one height cannot give. A grounded Drone now reads `0.0 m` in a cell that used
  to be empty, because the phase word beside it was the only thing saying where it was.
- **A Drone being watched is now "Under observation", not "Keep an eye on it".** Standing
  airworthiness vocabulary, parallel in grammar to `In service` and `Out of service` either
  side of it, and free of jargon a Teacher would need training on. **The stored `watch` key is
  untouched** — it is serialized into the browser logbook, so renaming it to match the new
  words would silently invalidate every service decision on every Teacher's laptop, with no
  migration and no error. A test now pins the key against exactly that.
- **"End the lesson" is a primary control rather than a ghost button.** It carried a hairline
  border and a transparent fill, for the one control a Teacher has to find across a room at
  the moment a class is packing up. It now uses the filled treatment "Start the lesson"
  already had, character for character — the two are symmetrical halves of one lifecycle. Not
  a Status colour: `design.md` §9 reserves colour for exception, and a lesson ending on time
  is the normal path. A test now weighs the pair against each other, since they live in
  different files with separate copies of the class string, which is how they drifted apart.
- **The scope writes each Drone's height under its name, in place of the phase word.**
  *"Level"* said the Drone was holding its height without saying what height; the number is
  the thing a Teacher can act on, and the phase is still on the flight strip in words. An
  airframe that cannot measure height draws no number at all — not a dash, not `0.0 m`, which
  is what a Drone on the floor correctly says. The height comes off `DroneState` rather than
  Vitals, so Reports gets labelled marks too.
- **The scope no longer captions its grid with a cell size.** *"Grid: 0.5 m"* read as a claim
  about what a cell measures on the glass, and every monitor is a different size, so on screen
  it could never be true. The grid itself is unchanged. The symbol keys stay — *Filled =
  flying* says what a mark means, not how big it is.

### Fixed

- **A Teacher on a screen reader is no longer told the scope is a room.** The `<svg>` was
  labelled *"Positions of N Drones in the room"* — the one claim ADR-0014 exists to deny.
  Sighted Teachers see a frame with no walls and read it correctly; a screen reader gave the
  opposite model of the picture, which makes it an accessibility defect rather than a wording
  one. It now reads *"Where N Drones are, looking down"*. `roomExtent` / `RoomExtent` were
  renamed to `scopeWindow` / `ScopeWindow` for the same reason, and the component's own doc
  comment, which still claimed the box was shaped like the room, went with them.
- **The scope's grid holds still, and its cells are square.** The window was the Fleet's own
  extent plus a metre, recomputed on every Fleet State, so the grid shifted, the frame
  reshaped and the number of cells changed on every telemetry tick — while `percentOf`
  renormalised each Drone into that same moving box, which left the Drones looking like the
  stationary thing. Reported as *"the squares move, the dots should move"*, which was exactly
  right. The window is now a square from a fixed ladder of five sizes, growing when a Drone
  leaves it and never shrinking, with cells of half a metre at the default size. A Drone
  beyond the largest window is held on the edge and named, never dropped. (Where it centres,
  and the caption that stated the cell size, both changed again below.) See [ADR-0014](./adr/0014-a-fixed-scope-window.md) for why a fixed window is
  not the flight area ADR-0012 deferred; without that distinction written down, the next
  reader deletes this.
- **The scope is an aid again, not the whole screen.** Making it square made it 1216 px tall
  at 1440 px, which put every flight strip below the fold — the strips are where a Teacher
  works, so that had the priority backwards. It is capped at 600 px and centred, in rem so
  LARGE FORMAT still grows it. All six strips are visible again without scrolling.
- **The scope frames the Drones instead of the setup point.** The window used to centre on
  the origin, so a Fleet set up in a corner drew in a corner with half the picture empty —
  and the wasted half pushed the marks together. It now centres on the middle of the Fleet,
  with the centre snapped to a whole cell so the grid still cannot drift, and it is only
  reconsidered when a Drone actually leaves it. The demonstration Fleet went from a 12 m
  window to an 8 m one for the same six Drones.
- **The scope's labels stop colliding on a phone.** Six labels in a short strip ran into one
  unreadable line at 390 px — the bug recorded in `Scope.tsx` found once before. Below 640 px
  a mark now shows only its Drone Name; the phase goes, because it is three times the width
  and is already on that Drone's flight strip further down the same screen. The name stays at
  every width, since answering *"which one is that"* is the whole reason the scope exists.
- **`npm test` is deterministic again.** Every component test that rendered a demonstration
  Fleet ran the real simulator with `Math.random` and spontaneous events switched on, so a
  Drone could take off unasked or drop its link on a 0.2%-per-tick roll in the middle of an
  assertion that it was standing still. The suite failed about one run in three and named a
  different test each time — recorded as O7 in `docs/TEST_REPORT.md` as a transient that did
  not reproduce. It reproduces. `LocalFleetOptions` had carried the seam for pinning this
  since it was written; `FleetProvider` simply could not reach it. Five consecutive full runs
  now pass 374 of 374. This matters more than a flaky test usually would: at the time there
  was no CI, so `npm test` run by hand was the whole gate, and a gate that is red one run in
  three has stopped being one.
- **The simulation label is a strip under the bar again, not a white block beside it.**
  `.site-header-shell` was `display: flex` with no axis, so the bar and the label became
  columns of a row. On a phone the label swelled to a quarter of the viewport. The label's
  own rule was always written as a full-width strip; only the axis above it was wrong.
  This is requirement C5 — the one label that exists so a Teacher never presses **Land**
  wondering whether a real aircraft is coming down — so it mattered that it looked broken.
- **The timeline says how much time it covers without garbling it.** It used to build a
  duration by deleting "ago" from an age, which held until the answer was "just now" or
  "yesterday" — neither of which contains the word — and printed *"Covering the last just
  now"* on a freshly started ground station. `formatDuration` in `lib/age.ts` now says a
  span in its own words.
- **The product has one name again.** `d94b160` renamed Flight Deck to Readyboard and
  `44d770f` restored it, but only in the header — ten page titles were still saying
  "TechTech Readyboard". Every tab now reads "… · Flight Deck · TechTech".

### Added

- **The rule a hardware adapter has to keep is written down as a test.** `CODEBASE_AUDIT.md`
  §8 noticed that `sameFleet` compares Telemetry by reference and judged it worth a test
  rather than a fix. Probing it first found something sharper than the note recorded: the
  ground station keeps the Telemetry object it is handed rather than copying it, so a source
  that fills one buffer and re-emits it — what a serial or MQTT adapter is most likely to do
  — would silently rewrite Fleet States it had already published, and a second reading
  inside the same millisecond would go unpublished. `telemetry-ownership.test.ts` asserts the
  requirement rather than the hazard, so it does not lock the defect in place. The fix, if it
  ever bites, is a copy on ingest. See ADR-0001 for why this is the seam that has to hold.
- **CI, for the first time.** `.github/workflows/ci.yml` runs `npm run typecheck`, `npm test`
  and the static export on every push to `main` and every pull request, on Linux **and**
  Windows — the repository is developed on one and deployed on the other, and every
  path-handling bug it has had lived in that gap. The two gates were always the whole gate;
  what was missing was anything that ran them without being asked. `npm run audit:devices`
  stays out: it needs a real browser and a built board, and belongs in a job somebody
  watches rather than one that blocks a merge.
- **`scripts/shot.mjs` is in the repository.** `CLAUDE.md` has named it as one of the two
  defences against a layout bug the jsdom suite cannot see, while it sat untracked — one
  `git clean` from gone, along with the Chromium-resolution knowledge it carries. It now
  photographs the whole page rather than a fixed 320px crop of the header, says plainly
  when the board is not built or Chromium is missing instead of failing inside Playwright,
  and finds Chromium on macOS and Linux as well as Windows. Shots land in `scripts/shots/`,
  gitignored — evidence for one fix, stale by the next.
- `docs/PLAYBOOK.md` — detected stack, how far behind current, conventions, pitfalls.
- `docs/DESIGN-TOKENS.md` — the design system as actually built, including the two-layer
  token structure that was not written down anywhere.
- First tests for `lib/age.ts` and `SiteHeader`.

### Changed

- **The scope draws the room in proportion, and its labels are readable.** East and north
  were normalised to 0–100 *independently* and the result forced into a 4:3 box, so a metre
  north and a metre east were different lengths on screen — and whether two Drones are about
  to meet is the one question the picture exists to answer. The viewBox is now in metres, so
  the scale is 1 and cannot drift. A 7 m × 2 m classroom draws as 7 m × 2 m instead of filling
  810px of height with empty room.
- **Drone marks are HTML, not SVG text.** Sized in user units they grew with a small room and
  shrank with a large one, ignored the Teacher's browser font size and the large format
  entirely — the one place on the board where a size was not relative (ADR-0008) — and six
  "On the ground" labels in a wide strip overlapped into one unreadable line.
- **A mark on the scope is reachable from a keyboard.** It was a `<g>` with an `onClick`: no
  focus, no role, no name, so the linked selection the scope exists for was mouse-only,
  against §11.3 of `docs/DESIGN.md`.
- **The flight strip has fixed anatomy at last.** `docs/DESIGN.md` §1.1 justifies the
  strip on being "scannable by position rather than by reading", but the row was a
  `flex flex-wrap`: every cell sized by its own content, so a variable-width phase word
  shifted every column to its right. It looked aligned only because every Drone was in the
  same phase. The columns now live on the list and each strip takes them by subgrid, so a
  wide value in one strip cannot move another's. Below the breakpoint the strip wraps, as a
  phone wants.
- **A grounded strip says "On the ground" once.** The phase column and the height column
  beside it both printed it. `formatVerticalMovement` now returns nothing when a Drone is
  not airborne — the phase word already carries the fact — and the empty cell still holds
  its column.

- **One page frame, in two named widths.** Five screens carried five different maxima —
  `6xl`, `5xl`, `4xl`, `3xl`, and `FleetBoard` with none at all — so the content edge moved
  every time a Teacher changed screen, and the Fleet screen rendered two frames at once.
  Instrument screens (Fleet, Control) now share one width and reading screens (Lesson,
  Reports, Students, Settings) another, both from `lib/frame.ts` and enforced by
  `web/page-frame.test.ts` so they cannot drift apart again. See `docs/DECISIONS.md`.

### Removed

- Three unused dependencies: `framer-motion` (every import is `motion/react` — the same
  library under its old name), `@fontsource/inter`, `@fontsource/plus-jakarta-sans` (only
  Schibsted Grotesk and Hanken Grotesk are loaded). And `web/components/Board.tsx`, dead
  since the Vite dashboard was retired (ADR-0010).

### Security

- `next` 16.2.10 → 16.2.11 (July 2026 security release). Hygiene rather than exposure: every
  CVE in that release is server-side, and this build is a static export with no server. `npm
  audit`'s three remaining highs are build-time-only (postcss, sharp) and its autofix
  downgrades to `next@9`; left as-is and recorded in `docs/DECISIONS.md`.

### Also

- `/showcase` no longer opens a WebSocket on the standalone deploy, where there is no ground
  station to reach. It fell back to the demonstration Fleet already, but logged an
  `ERR_CONNECTION_REFUSED` on every load getting there.
