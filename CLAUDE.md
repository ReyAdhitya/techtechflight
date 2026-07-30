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

**YOLOv8n weights are not in git.** Run `node scripts/fetch-yolo-model.mjs` (or
`npm run fetch:yolo`) so `web/public/models/yolov8n.onnx` exists (~12 MB). Without it the
board falls back to the demo detector. Wasm loads from jsDelivr. Sim Start camera asks for
the laptop webcam so the model has real pixels.

**Camera QR is a landing target, not a scanner.** Only `ttf-land:…` payloads count; they
answer where to land and stay display-only unless a Teacher presses sim **Place at landing
pad (demo)**. Do not write QR into Telemetry. On the sim feed the scanner reads
`/qr/landing-pad-a.png`.

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
