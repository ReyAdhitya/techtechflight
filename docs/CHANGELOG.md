# Changelog

Newest first. One line per change that a Teacher, or the next person reading this code,
would notice.

## Unreleased

### Fixed

- **The scope's grid holds still, and its cells are square.** The window was the Fleet's own
  extent plus a metre, recomputed on every Fleet State, so the grid shifted, the frame
  reshaped and the number of cells changed on every telemetry tick — while `percentOf`
  renormalised each Drone into that same moving box, which left the Drones looking like the
  stationary thing. Reported as *"the squares move, the dots should move"*, which was exactly
  right. The window is now a square from a fixed ladder of five sizes, centred on the setup
  point, growing when a Drone leaves it and never shrinking. Cells are half a metre at the
  default window and the caption states which — read from `gridStepM()`, so it cannot lie
  when the window grows. A Drone beyond the largest window is held on the edge and named,
  never dropped. See [ADR-0014](./adr/0014-a-fixed-scope-window.md) for why a fixed window is
  not the flight area ADR-0012 deferred; without that distinction written down, the next
  reader deletes this. **Two costs, both photographed and neither addressed:** the square
  scope is about 3.5× taller at 1440 px, pushing every flight strip below the fold, and the
  Fleet now occupies a smaller share of the frame, which makes the Drone labels overlap on a
  390 px viewport.
- **`npm test` is deterministic again.** Every component test that rendered a demonstration
  Fleet ran the real simulator with `Math.random` and spontaneous events switched on, so a
  Drone could take off unasked or drop its link on a 0.2%-per-tick roll in the middle of an
  assertion that it was standing still. The suite failed about one run in three and named a
  different test each time — recorded as O7 in `docs/TEST_REPORT.md` as a transient that did
  not reproduce. It reproduces. `LocalFleetOptions` had carried the seam for pinning this
  since it was written; `FleetProvider` simply could not reach it. Five consecutive full runs
  now pass 374 of 374. This matters more than a flaky test usually would: there is no CI, so
  `npm test` run by hand is the whole gate, and a gate that is red one run in three has
  stopped being one.
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
