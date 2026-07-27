# Test report

Phase 7, opened early and kept running. Findings are written down when they are found
rather than reconstructed at the end, because the ones worth having are the ones nobody
would remember to look for afterwards.

**Current state:** 377 tests passing, three typechecks clean, the board builds, and the
device audit is clean across 8 devices, 3 widths and 6 routes. Every finding raised during
implementation is closed, measured, or recorded as a decision with its reasoning. Progress against the plan is in
[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md#progress).

**The suite now runs on a machine as well as by hand** — `.github/workflows/ci.yml`, on Linux
and Windows, on every push to `main` and every pull request. Everything below was found by
running things by hand, which worked until it did not: O7 was written off as a transient after
ten clean runs, and was a one-in-three flake the whole time.

## Coverage by project

| Project | Environment | Covers |
|---|---|---|
| `contract` | node | The commandable seam |
| `fleet-core` | node | Status, ageing, charge, history, the simulator, command routing |
| `ground-station` | node | The socket, static serving, command frames |
| `web` | jsdom | Screens, `lib/`, both links, import boundaries |

## Open findings

### O6 — Teacher records live in one browser
**Severity: medium · Requirement H6 · Mitigated, not solved**

`localStorage` only. Both halves of the agreed mitigation are in place: Settings warns
before the quota is reached rather than after, and ending a Lesson offers the export at
the moment the records are worth most and have just grown.

What remains is not a defect but a limitation with a name. Records still do not follow a
Teacher to another laptop, and clearing site data still clears them. The eventual answer
is a ground-station-backed record, and it needs its own ADR before any of it is written:
it opens a **second write path** — with its own authority, conflict and multi-Teacher
questions — and opening it in the same stretch of work as the Command path would mean two
new directions of travel at once. **This is a decision for the product, not a task.**

### O5 — `/showcase` carries `three.js`
**Severity: low · Audit F8 · Measured, and accepted**

Measured rather than argued about:

| | |
|---|---|
| All JS chunks in a build | 2,006 KB |
| Chunks containing `three.js` | 871 KB |
| What `/control` actually loads | **820 KB across 13 chunks** |
| Does `/control` include `three.js`? | **No** |

So it costs a Teacher nothing at runtime — route splitting does what it was assumed to do.
What it does cost is install time, and 871 KB sitting unused in the `web/out` a School is
served. That is small enough to accept, and `/showcase` earns its place as the design
argument the restrained board was chosen against.

**Retiring it is a one-line decision available at any time** — the same reasoning ADR-0010
applied to `dashboard/` would apply — but it is somebody's design work rather than a
defect, so it is not removed on the strength of a bundle measurement.

## The device audit

`npm run audit:devices`, against a built board. **Clean: 8 device profiles, 3 desktop
widths, 6 routes each — 66 page audits.**

| | |
|---|---|
| Devices | iPhone SE · iPhone 12 · iPhone 14 Pro Max · Pixel 7 · Galaxy S9+ · Galaxy Tab S4 · iPad Mini · iPad Pro 11 |
| Widths | laptop 1280 · desktop 1680 · projector 1920 |
| Routes | `/demo` `/control` `/lesson` `/students` `/reports` `/settings` |
| Checks | tap targets probed at 44px · horizontal overflow · uncaught page errors |

**Tap targets are probed, not measured**, and the first two versions of this audit were
wrong in opposite directions because of it. Measuring boxes reported 407 problems, nearly
all of them controls whose hit area is deliberately expanded by an absolutely positioned
`::after` — the whole Drone tile is its Details button, and a pseudo-element appears in no
rectangle the DOM will hand you. Hit-testing the centre point alone would have missed the
opposite failure: a control of exactly the right size with something painted over it.

So the question asked is the one that matters: **if a finger lands anywhere within 44px
centred on this control, does it reach it?** Four probe points per control, per route, per
device.

That found one real defect and nothing else. Every navigation link was 40px tall — close
enough to look right, four pixels short of what a finger reliably lands on, on every
screen and every device. Fixed.

## Findings already closed

Each was caught by a check rather than by luck, which is the part worth keeping.

| Finding | Where | How it was caught |
|---|---|---|
| The ground station served the **old board** — no Control, Lesson, History or Maintenance for any School | Audit F2 | Reading `main.ts`, then confirmed live |
| Pointing at `web/out` alone would have **404'd every route but `/`** | Task 1.4 | Probing a running server before writing the fix |
| The first `fleet-core` Node guard **passed with a `node:fs` import present** — `@types/node` arrives transitively through `vitest` | Task 1.3 | Insisting the guard be seen failing first |
| `web/lib/fleet-connection.ts` had **no tests at all**, including the de-duplication that stops a fault appearing twice after a reconnect | Task 2.1–2.3 | Parity audit before deleting `dashboard/` |
| The subscriber test **passed by accident** — it asserted the whole notification sequence and only held because that scenario sent no history frame | Task 2.2 | Reading it rather than trusting it |
| `@vitejs/plugin-react` was **borrowed from `dashboard/`**; the root suite stopped loading entirely when that workspace left | Task 2.4 | The deletion itself |
| The deployed demo **could not animate** — `climbing` and `descending` were unreachable | Audit F5 | Reading `scenarios.ts` |
| `AltitudeTracker` and `AlertTracker` **reset on navigation**, losing every rate and alert start time mid-lesson | Task 3.5 | Mapping state for the architecture |
| `DemoBoard` was **dead code** kept alive only by its own test, driving a second fixture-based board | Task 3.4 | Grepping for usages |
| Adding a `ServerMessage` member exposed a **narrowing bug**: anything not a state or history was read as a list of events | Task 5.1 | The type system |
| A test asserted behaviour the code **does not have** (O2). Replaced rather than the production code quietly changed | Task 2.3 | Running it |
| Every navigation link **aborted a prefetch** — a static export has no RSC payload behind a route, so six wasted requests per screen and a console full of them | Audit F7, task 8.5 | Driving a real browser through every link |
| Every navigation link was **40px tall**, four pixels short of a reliable tap, on every screen and every device | Task 8.3 | Probing 44px around each control on 8 devices |
| `mergeEvents` **republished a record that had not changed**, re-rendering every screen on every replayed batch | O2 | A test that had only described it in a comment |
| Altitude was sampled at **React's render cadence, not Telemetry's** — several Fleet States in one batch collapsed to one reading, so a steadily climbing Drone produced no rate at all | O3 | Writing the test the batched way and watching it fail |
| A **transient test failure** that did not reproduce across ten subsequent full runs; ran alongside a `tsc` invocation, and has not returned since | O7 | Repeating the run rather than dismissing it |
| ~~O7 was not transient.~~ **It reproduces at about one run in three**, naming a different test each time. Every component test rendering a demonstration Fleet ran the real simulator against `Math.random` with spontaneous events on, so a Drone could take off unasked mid-assertion. Ten clean runs was luck, not evidence | O7, reopened and closed | Running one file in a loop rather than the whole suite once |
| An empty `dashboard/` directory | O8 | Contents removed; the directory itself is held by a file handle and is untracked, so it survives only until the handle is released |

## Final verification

Run at the close of Phase 6, against the real deployment path rather than a test harness.

| Check | Result |
|---|---|
| `npm test` | **337 passing, 25 files** |
| `npm run typecheck` | Clean — `contract`, `fleet-core`, `web` |
| `npm run build --workspace=web` | Compiled, all routes prerendered static |
| `npm run audit:devices` | Clean — 8 devices, 3 widths, 6 routes |
| Console and network | No failed requests, no console errors across a full navigation |
| Ground station, live | Serves every screen at 200 with correct titles; every retired route forwards |
| Socket, live | 6 Drones, `fleet-state` → `fleet-history` in order |

The live check matters more than it looks. A runtime error white-screens a page that still
returns 200, and the ground station's own `main.ts` has no test covering it — so the only
honest way to know a School gets a working board is to start one and ask it.

## Requirements, point by point

Against [`REQUIREMENTS.md`](./REQUIREMENTS.md). 79 requirements: 46 Exists, 8 Extend, 24
New, 1 out of scope.

| Group | State |
|---|---|
| **A. Fleet monitoring** (12) | All met. Nothing marked Exists regressed; `FleetBoard`'s 43 tests still pass unchanged |
| **B. Flight Control Center** (9) | 8 met. **B7 dropped** by decision — behaviour is not compared to intent, because no Exercise declares an expected phase |
| **C. Flight control** (10) | All met. Commands reach a simulated Fleet only; a hardware source refuses structurally |
| **D. Student management** (9) | All met |
| **E. Mission Planner** (8) | 7 met. **E8 out of scope** — the flight area, deferred by ADR-0012 |
| **F. Alerts** (10) | All met, including acknowledgement and all three ways a taken Alert returns |
| **G. Flight reports** (6) | All met, including printing |
| **H. Records** (6) | All met. **H6 mitigated rather than solved** — see O6 |
| **I. Conditions of use** (9) | All met. I9 closed by task 1.4 |

## Verification method

Two rules applied throughout, and both earned their place:

**A guard is not trusted until it has been seen to fail.** The `fleet-core` Node guard
passed its first version while permitting exactly what it forbade. Nothing since has been
believed on the strength of a green run alone.

**New coverage is mutation-checked.** Each of the nine history-merge tests was run against
a deliberately broken copy of the behaviour it covers; every mutation failed exactly its
own test and no others. A test that passes against both the correct and the broken
implementation is not coverage.
