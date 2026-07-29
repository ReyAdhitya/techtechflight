# Decisions

Judgement calls made while working, that are not big enough for an ADR but would otherwise
be invisible. Newest first. An entry here is a thing someone could reasonably have done
differently — not a record of every change.

For architecture, see [`docs/adr/`](./adr/). For the design system, see
[`../design.md`](../design.md) and [`DESIGN-TOKENS.md`](./DESIGN-TOKENS.md).

---

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
