# TechTech Flight

A ground-station dashboard showing a school teacher the status of every drone in their
classroom set. See [README.md](./README.md) for orientation.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues on `ReyAdhitya/techtechflight`, managed with the
`gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its role name: `needs-triage`,
`needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See
`docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` and one `docs/adr/` at the repo root. See
`docs/agents/domain.md`.

## Read before doing anything

`docs/PLAYBOOK.md` (stack, versions, pitfalls) · `docs/DESIGN-TOKENS.md` (the design
system as built) · `docs/DECISIONS.md` · `docs/CHANGELOG.md` · `design.md` (the system) ·
`docs/DESIGN.md` (the product spec — a different document, confusingly) · `CONTEXT.md`
(the words) · `docs/adr/`.

## Gotchas — the things that aren't obvious from the code

**Three files have "design" in the name and they are different kinds of thing.**
`design.md` is the design *system* (tokens, colour, type). `docs/DESIGN.md` is the product
*spec* (what a Teacher sees on each screen). `UI-DESIGN.md`, if present, is a *workflow*
document and not a project document at all.

**Colour is defined twice, and both layers matter.** `globals.css` has shadcn-shaped base
tokens (`--background`, `--card`) and a semantic layer over them (`--color-canvas`,
`--color-surface-1`, `--color-ink-subtle`). **Markup uses the semantic layer** — `bg-canvas`,
`text-ink-subtle`, `border-hairline`. Writing `bg-background` works but is foreign.

**jsdom cannot catch a layout bug.** The whole test suite is jsdom, so a broken flex axis
or a wrong aspect ratio passes green. Two defences: assert on the stylesheet directly when
the invariant is a layout one (see `SiteHeader.test.tsx`, and `vercel-routing.test.ts` for
the same idea applied to config), and **look at a screenshot** before believing a visual
fix. `scripts/shot.mjs <label> <route> <width> [height]` photographs a route — it serves
`web/out`, so **build first**; it does not build for you. Omit `height` for the whole page.
Shots land in `scripts/shots/`, which is gitignored. **Print is the same class of bug:**
dark-theme semantic tokens stay light-on-white unless `@media print` resets them (see
`ReportsScreen.test.tsx`). Browser Headers and footers (URL, clock) are not CSS — Teachers
turn them off in the print dialog.

**`--text-value` is deliberately the same size as `--text-body`.** Data is not small print
here. And every size is `rem` — a `px` font-size on this surface is a defect (ADR-0008).

**Mission is now a first-class word (ADR-0018), and it used to be banned.** `CONTEXT.md`
listed it under Lesson's `_Avoid_` and `docs/DESIGN.md` banned it on screen; both were
amended on 2026-08-04. A **Mission** is one run of a **Mission Scenario** inside a Lesson,
and Mission Scenario is what a Teacher picks where they used to pick an Exercise. *Sortie*,
*pilot*, *callsign* and *UAV* are still banned — the admission was narrow and reasoned.

**Zones are drawn in the Fleet's own local frame, and that is the safety argument
(ADR-0019).** A zone shares its origin with the Drone positions, so "inside this polygon" is
a *relative* claim and survives an origin that is wrong — the same way separation alerts
already do. This supersedes ADR-0012's deferral. Never anchor a zone to a latitude; there is
no GPS, no map tile and no network anywhere in this feature, deliberately.

**A No-fly Zone has no ceiling, so it draws on all three views (ADR-0029).** ADR-0019 refused
Side and Front on the grounds that a band would assert a vertical extent nobody drew. There is
none to invent: `Zone` carries a polygon and nothing else, and `breachesAt` has always ignored
altitude, so the extent is the whole column. On Side and Front the zone is the polygon's
*extent* on that axis, floor to ceiling, hatched and named the same way. Drawing nothing was
the board saying "no-fly breach" on a strip and "clear air" on the picture beside it.

**Only no-go areas are drawn (ADR-0027).** `ZoneKind` is `'no-fly'` and nothing else. The
Mission Zone is gone: the class flies inside a physical net cage, so a second boundary drawn in
software told a Teacher something they could already see, and a slightly small one reported a
breach for a Drone that was safely inside the netting. The success criterion is **no no-fly
breach**, and step 3's lock reason is *Choose a Scenario first* rather than *Draw the Mission
Zone first*. Do not add a go-area back without a new ADR.

**Three state vocabularies, and they stay apart (ADR-0020).** `Status` (ground station, "can
I hand this out"), `FlightPhase` (board, "what is the aircraft doing"), `MissionPhase`
(board, "how is the Mission going"). Do not collapse any pair.

**Most of what a Teacher does is not a Command (ADR-0021).** Approve takeoff, assign a new
target, reprioritise and reroute are **records**, because the Students fly the aircraft by
hand. They work on real hardware. Only Land, Hover, Auto-land, Stop and Recall are Commands,
and those still reach the simulated Fleet only.

**`docs/DELIBERATE-POSITIONS.md` lists six positions that look like bugs.** Tiles never
reorder, counts render at zero, elevation is lightness only, the amber/coral hue split.
Argue with them in an ADR or leave them alone.

**Windows classroom start:** double-click `Start TechTech Flight.bat` at the repo root —
no npm typing. It starts ground-station on **:4321** and opens the board. Default Fleet is
the Simulator; Settings **Classroom setup** can prefer Radio (MAVLink) for the next launch
(monitoring only, ADR-0011) — still no hardware `CommandableSource`.

**Windows:** `next build` fails with `EBUSY: rmdir 'web/out'` if any shell has that
directory as its working directory. Git Bash rewrites a bare `/route` argument into a
Windows path — pass routes to `scripts/shot.mjs` from PowerShell.

**MAVLink is Node-only.** `@techtechflight/fleet-adapters` speaks UDP via `node:dgram` and
must not be imported from `web/` or `fleet-core/` (ADR-0013). Opt the ground station in with
`TELEMETRY_SOURCE=mavlink` (optional `MAVLINK_HOST` / `MAVLINK_PORT`). It does not implement
`CommandableSource` — monitoring only (ADR-0011).

**Lesson/Student Logbook is this browser first; optional Vercel copy.** Records live in
`localStorage` on the machine running the board. With a sync secret (Settings /
`LOGBOOK_SYNC_SECRET`), a debounced copy goes to Vercel Blob via `/api/logbook`
(ADR-0015). Telemetry never carries Logbook rows. Do not invent a Postgres school DB.

**Camera stream URLs are never Telemetry.** Map is build seed `NEXT_PUBLIC_CAMERA_STREAM_MAP`
(JSON object) or localStorage `techtechflight:camera-stream-map` when already set — no
Teacher Settings form (#50). `CameraPane` uses native `<video>` for mapped hardware streams;
sim ignores the map. Sanitize to absolute http(s) only — no `javascript:` / credentials.
Teaching entry is the Control/Fleet **Camera** dialog (`CameraSlide`). Camera on a strip is
not a Command (C9).

**Optional YOLO11x AI service** lives in `ai-service/` (FastAPI, default
`http://127.0.0.1:8090`). CUDA when an NVIDIA GPU is present, CPU otherwise. The board
probes it from `boardDetector()` and falls back to in-browser YOLOv8n wasm, then the demo
detector. See `ai-service/README.md` and ADR-0023. Do not put detection boxes on Telemetry.
`Start TechTech Flight.bat` starts the service when `ai-service/.venv` exists.

**YOLOv8n weights and the wasm runtime are not in git.** Run `node scripts/fetch-yolo-model.mjs`
(or `npm run fetch:yolo`) so `web/public/models/yolov8n.onnx` (~12 MB) **and**
`web/public/ort/` (~26 MB) exist. Without either, the board falls back to the demo detector
— which draws two confident invented boxes, so it looks like it is working. `/vision` is the
screen that says otherwise. The Vercel build runs the fetch before building. Sim Start camera
asks for the laptop webcam so the model has real pixels.

**Which onnxruntime wasm to vendor is not a preference.** The package ships four builds
(plain, `jsep`, `asyncify`, `jspi`, 77 MB together) and the *main entry point* decides which
one is loaded — at 1.27 it is **`jsep`**, even though the board only ever asks for
`executionProviders: ['wasm']`. Vendoring the wrong one 404s, throws inside session creation,
and silently falls back to the demo detector. After an `onnxruntime-web` upgrade, build and
run `grep -rho "ort-wasm[a-z0-9.-]*" web/out/_next/static/chunks | sort -u`.

**A camera needs a secure origin.** `getUserMedia` is refused on a plain `http://` address
other than `localhost`, so opening the board at the laptop's LAN address breaks the camera in
a way that reads as a permissions problem. `/vision` says so explicitly.

**Camera QR is a landing target, not a scanner.** Only `ttf-land:…` payloads count; they
answer where to land and stay display-only unless a Teacher presses sim **Place at landing
pad (demo)**. Do not write QR into Telemetry. On the sim feed the scanner reads
`/qr/landing-pad-a.png`.

**`AirborneTracker.observe` must not `setState` on every vitals tick.** `vitals` is often a
fresh array each render; an effect that observes then bumps a tick state will hang Control
under jsdom. Observe inside `useMemo` (or only setState when the since-map actually changes).

**Control strip anatomy stays open, and the strips are now on step 9 (ADR-0030).** Every
strip keeps its coordinate line and Land / Hover / Recall / Stop in the flow (DESIGN §4.4) —
do not gate those on selection, and do not compact them, which broke CI and hid Commands from
the scan path. **What changed is the step, not the strip:** steps 6 to 10 each show one panel
now, so per-Drone commands are one rail tap away rather than zero. That cost is a ruling, not
an oversight, and it is paid for by the fixed emergency bar below.

**The Attention bar and Land all · Hover all · Stop all are on every step, 6 to 10
(ADR-0030).** They never scroll away, are never gated on selection, and are the answer to
ADR-0026's objection that a Command behind a navigation press is a Command a Teacher cannot
reach in ten seconds. An emergency in a room full of children is "everything, now", and that
is one tap from anywhere in the run. Do not move them into a step.

**Parallel-wave changelog fragments.** During a multi-agent wave, agents write
`docs/changelog.d/<issue>.md` instead of editing `CHANGELOG.md` / `DECISIONS.md`. The
Integrator merges those fragments in issue order and deletes them — leftovers mean the wave
never integrated.

**The Mission run is one page with the twelve-step rail on it (ADR-0026, 2026-08-07).** The
2026-08-06 supersession of ADR-0024 was reversed by the product owner: the rail is the
product, and `/mission` is where it lives. `MissionRunScreen` mounts `StepRail` and one step
surface. **The rail is the only navigation on that page** — `SiteNav` collapses behind one
button holding Fleet, Walls, Students and Vision, because two navigations on one screen is
the confusion this change exists to remove. **Every step shows one panel** — set-up 1 to 5, in
the air 6 to 10 (ADR-0030 reversed ADR-0026 on that; see the fixed emergency bar above), and
11 and 12 to close down. `/lesson`, `/control` and `/reports` still resolve and send a Teacher
to the step that answers them. Argue with the rail in an ADR or leave it alone.

**A step nobody is looking at goes on computing.** Points tick off from Telemetry, the
classroom session is written, the heartbeat beats and Alerts are raised whether or not the
panel that shows them is mounted, because none of that lives in a panel. If you move one of
those into a step's own component, it stops happening for the other nine.

**A rail step says what it decided, not that it is finished.** Every step carries a *done
string* (`missionStepDone` in `web/lib/mission-flow-summary.ts`) and a *lock reason*
(`missionStepBlockedBy`), and both are the prototype's own wording: "Search and Rescue",
"1 zone, 2 no-fly", "Grant a takeoff first". A tick alone tells a Teacher they did something
and not what they chose. Steps 7 to 10 read `live` while the class is up and settle to `done`
when the Mission is sealed; they never read as ticked off mid-lesson. **Only a locked row
consults the blocker** — a step can be behind a Teacher *and* have its condition stop
holding (untick the brief after granting), and a tick beside "Pre-flight one craft first" is
the rail arguing with itself. **Exactly one row reads `current`, and it is the active one**,
so a Teacher looking ahead does not see two rows saying "You are here".

**A Mission becomes under way when the flying board mounts, so step 11 needs step 6 first.**
`ControlScreen`'s effect calls `startMission`, and `isMissionStepOpen(11)` needs
`mission.startedAt`. A test that jumps straight to step 11 has to call `startMission` itself.

**A worktree's `node_modules` junction points the workspace packages at the *main* checkout.**
`node_modules/@techtechflight/fleet-core` is a symlink npm made in the main repo, and a
worktree that junctions `node_modules` inherits it: an edit to `fleet-core/src` in the
worktree is invisible to `web/` there, and `tsc` reports the *main* checkout's types. Fix it
per package rather than inside the junction (which is the main repo's directory):
`New-Item -ItemType Junction web/node_modules/@techtechflight/<pkg> -Target <worktree>/<pkg>`.

**`scripts/shot.mjs` seeds the board role.** `RequireRole` sends a fresh browser profile to
`/enter`, so every Teacher screenshot taken between the role gate shipping and 2026-08-07 was
a photograph of that door. `TTF_SHOT_ROLE=student` seeds the other one. A shot needs
`NEXT_PUBLIC_DEMO_ONLY=1` at build time too, or the board waits for a ground station.

**A saved theme does not survive hydration, and this predates the rail.** The boot script in
`layout.tsx` stamps `data-theme` on `<html>` before paint, and after React hydrates the
attribute is gone: `document.documentElement.dataset.theme` reads `undefined` on a load where
`localStorage.theme` is `dark`. The **toggle** works, so the dark theme itself is fine. Not
fixed here, and not caused by ADR-0026.

**Lesson set-up is steps 1 to 5, and nothing else.** Choose the Scenario, draw the airspace,
put teams on craft, tick pre-flight, brief the class. Everything that is not one of those
lives on the screen whose question it answers: Fleet health craft by craft is the **Fleet**
board's, finished Lessons and the remedial queue are **Reports**', pack-down is step 11, and
where records are stored is said on **Settings** alone. Before adding a block to a set-up
step, ask which step or screen already answers it. Two surfaces holding one list means one of
them is stale.

**A Student's progress is written by the Teacher's board, not by the tablet.** Points tick
off in `ControlScreen`, because that is where the Telemetry is, and land in the seat's
`reachedCheckpointIds` — **a list, in any order**, never an index, because a Student flying
by hand goes to whichever point is nearest and an index calls that a failure. `Approve` is
the Teacher's one tap and `approveSeatTask` refuses a seat with a point outstanding, so the
button cannot mark work nobody flew. `'returning'` follows approval; `'complete'` follows
Telemetry seeing it down, and only from `'returning'`, because a Drone that touches down
mid-Mission has landed rather than finished.

**`studentStep` must not disagree with the screen beside it.** Step 12 is Score, and a seat
that is down and complete with no sealed score is still at 11: the stage says "you are down,
wait", and a rail reading Score next to that is the rail contradicting the stage. A
screenshot caught that; the tests did not.

**Every classroom-session writer starts from the session it is handed.** They each persist
what they return, so one answer reaches the tablet on its own, but answering two Drones from
the same stale session writes a session missing the first answer. `ControlScreen` threads the
return value between its grant and hold loops for that reason, and the thread has been read
as dead code and called a stop-the-line once already. `classroom-session.test.ts` pins both
halves.

**An unknown Tailwind class emits nothing and fails nowhere.** `text-caption` had twenty
callers and no rule behind it for months: every one silently inherited its parent, and a
missing size is invisible in a way a missing colour is not. `web/type-scale.test.ts` now
refuses any `text-*` with no token, and it found two more the day it was written.

**Grant and Hold are both records, and there is no Release.** `holdClearance` sits beside
`grantClearance` in `web/lib/clearance.ts` and `holdSeatsForDrone` beside
`grantSeatsForDrone` so the answer reaches the tablet in words. A held request **stays in the
queue** reading *Held*, because dropping it would make the Teacher's own answer invisible to
them. Granting supersedes a hold; a third button on a row read at a glance costs more than it
answers. Neither reaches an aircraft (ADR-0021).

**A Mission is a side key, not a Logbook row.** `techtechflight:mission-draft` holds the
Scenario, the zones and the craft; `techtechflight:clearances` holds takeoff clearances. Both
are keyed by Lesson id, and a Mission planned before Start is adopted by the Lesson that starts
(`adoptMissionDraft`). A Mission becomes *under way* when a Teacher opens Control with one on
the Lesson: starting it on the first granted clearance is circular, because the queue fills
from eligibility and eligibility needs an active Mission.

**The Student's tablet is a second audience, not a narrow board (ADR-0025).** It reads the
classroom session (`techtechflight:classroom-session`), which `ClassroomOpen` writes from the
Mission the Teacher already planned, including the sealed `outcome`. Landscape and full width,
one dominant thing at a time and it changes with the phase, and **exactly two pressable things
in the whole app**: Ask to take off, and Understood. Join on an iPad with the Teacher's
classroom code (`/api/classroom` + Blob when configured; localStorage + BroadcastChannel on one
machine). No permanent classroom code on the Student chrome after join, and no figure the Fleet
is not sending. Which screen a Student is on comes from Telemetry and the Teacher's answer,
never from a press: `flownAt` is the first sighting off the ground, and `held` is its own phase.
Limits: nothing here reaches an aircraft (ADR-0021), and an absent reading is printed as absent.

**The Student rail is a paragraph, not a navigation (ADR-0028).** The tablet shows all twelve
steps down the left, marking the one they are on, and **not one row is pressable**: no link, no
button, nothing focusable. That is what keeps the two-press rule true, and it is why ADR-0025's
"no phase counter" was amended rather than broken. A Student never chooses what happens next, so
a rail that answered a press would be offering a choice that does not exist. The twelve are the
lesson, not the software: Briefing, Rules and time, Prepare, Connect, Ask to take off, Take off,
Fly the points, Stay out of red, Teacher says, Task done, Land, Score.

**A role is a secret, not a preference.** The door asks for the classroom code (Student,
public, read out loud) or a four-digit Teacher PIN (`web/lib/teacher-pin.ts`, private, set
once). **Switch role is gone from the Student chrome** and PIN-gated on the Teacher side: it
used to sit in the header of every screen, which was two taps from a child to Land and Stop.
The stored digest is FNV-1a and defeats a glance at the Application tab and nothing else;
the real lock is iPad Guided Access, which Settings recommends. Do not "harden" the digest
and imagine it now protects something.

**Nothing leaves the ground that a Teacher did not clear.** The simulator's `#wander` used to
`takeOff` on a dice roll every tick, so the board opened with Drones already flying. It no
longer flies or lands anything; lost links, faults and charging stay. A grant calls
`scenarios.flyRoute(droneId, points)` and an approval calls `scenarios.flyHome(droneId)` —
the simulated aircraft playing the child's part, not Commands, and null on hardware.
`fleet-core/src/simulator/flies-the-route.test.ts` pins both halves.

**`mission.checkpoints` is empty unless something writes it, and two things depend on it.**
`flyRoute` gets an empty route and `allPointsReached` returns false forever, so Approve never
appears. `web/lib/demo-mission.ts` is currently the only writer. A Mission with no points is a
Mission nobody can finish.

**No Student, no takeoff, and the Student is the classroom seat first.** `studentOnDrone`
takes the seat a child took on their tablet, then the Logbook assignment. Both the clearance
queue and the rail's count of it read that one function; two rules for who counts as a
Student is two numbers disagreeing in front of a class.

**Both sides of the classroom session beat every ten seconds** (`touchBoard`, `touchSeat`,
`QUIET_AFTER_MS`). Both re-read the session at the moment they beat rather than using the one
React handed them: they fire on a timer and the other side writes the same document. A seat
with `seenAt === null` has no tablet — a child the Teacher seated by hand — and is never
reported as quiet.

**Screens may not import `fleet-core/simulator`.** `web/import-boundaries.test.ts` enforces
it for `components` and `app`. Anything a screen needs from there is re-exported through
`web/lib` (see `classroom-fleet-size.ts`), and display facts like `COMFORTABLE_BOARD_SIZE`
belong in `web/lib` outright.

**Batch 1A side keys are not the Logbook.** Attendance seals, pupil notes, pupil flight-hour
seals, safety-brief ticks, camera orientation, separation threshold, altitude floor, spare
nomination, and ceiling-breach counts each live in their own `localStorage`
key (`techtechflight:…`). Closing a Lesson must call `sealAttendanceFromBook` (and preferably
`sealPupilFlightHours`) — the marks do not persist into history by themselves. Do not fold
these into the Logbook shape without an ADR.

## Standing rule: save after every task

The session can end without warning. After EVERY completed task, before starting the next:
update `docs/CHANGELOG.md` and `docs/DECISIONS.md`, add anything non-obvious to the
Gotchas above, then commit and push. Never leave completed work uncommitted.

## Rules

- Understand before changing. Minimal diff. Follow existing patterns.
- Branch, PR, review, merge. Conventional commits (`feat:`/`fix:`/`docs:`/`chore:`) as of
  2026-07-24 — see `docs/DECISIONS.md`. Earlier history uses prose subjects.
- Verify against existing behaviour — old tests must still pass.

## Commands

- Install: `npm install`
- Run dev: `npm run dev:ground-station` (`:4321`) and `npm run dev:web` (`:3000`)
- Test: `npm test` · Typecheck: `npm run typecheck`
- Build: `npm run build --workspace=web` (add `NEXT_PUBLIC_DEMO_ONLY=1` for the standalone
  deploy, which runs the Fleet in the browser)
- There is **no lint**. CI (`.github/workflows/ci.yml`) runs `npm test` and
  `npm run typecheck` on push and pull request — that pair is still the whole gate.
