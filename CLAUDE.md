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

**Control strip anatomy stays open.** Every strip keeps its coordinate line and Land /
Hover / Recall / Stop in the flow (DESIGN §4.4) — do not gate those on selection. Fleet-wide
Land all · Hover all · Stop all may sit under the Scope; Attention is one focused card plus
a disclosure queue. Compacting grounded strips broke CI and hid Commands from the scan path.

**Mission run rail ≠ SiteNav.** `MissionRunRail` always lists the twelve ATC steps on the
left (derived via `runStep` when a Lesson is open; idle → step 1 + Go to Lesson). Top
`SiteNav` still switches rooms. Do not hide the rail behind `runningLesson` again — that
made deploys look like a no-op.

**Parallel-wave changelog fragments.** During a multi-agent wave, agents write
`docs/changelog.d/<issue>.md` instead of editing `CHANGELOG.md` / `DECISIONS.md`. The
Integrator merges those fragments in issue order and deletes them — leftovers mean the wave
never integrated.

**Batch 1A side keys are not the Logbook.** Attendance seals, pupil notes, pupil flight-hour
seals, safety-brief ticks, camera orientation, separation threshold, altitude floor, spare
nomination, screen lock, and ceiling-breach counts each live in their own `localStorage`
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
