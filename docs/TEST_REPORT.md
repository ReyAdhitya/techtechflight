# Test report

Phase 7, opened early and kept running. Findings are written down when they are found
rather than reconstructed at the end, because the ones worth having are the ones nobody
would remember to look for afterwards.

**Current state:** 337 tests passing, three typechecks clean, the board builds, and the
device audit is clean across 8 devices, 3 widths and 6 routes. Progress against the plan is in
[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md#progress).

## Coverage by project

| Project | Environment | Covers |
|---|---|---|
| `contract` | node | The commandable seam |
| `fleet-core` | node | Status, ageing, charge, history, the simulator, command routing |
| `ground-station` | node | The socket, static serving, command frames |
| `web` | jsdom | Screens, `lib/`, both links, import boundaries |

## Open findings

Ordered by what would hurt most.

### O2 — `mergeEvents` publishes on every batch
**Severity: low · Found in task 2.3**

`web/lib/fleet-connection.ts` builds a new history object unconditionally, so the identity
check in `#update` never matches and every `fleet-events` frame notifies every screen —
including one carrying nothing new. Harmless while the ground station only sends a batch
when it has something to say. Recorded in the test that found it.

### O3 — Altitude is sampled at React's cadence, not Telemetry's
**Severity: low · Found in task 3.5**

`AltitudeTracker.observe` runs in an effect, so it sees one reading per render rather than
one per Fleet State. In production those coincide; under batching they do not, which is
why the provider test advances a tick at a time. It means a vertical rate is derived from
however many renders happened, not however many readings arrived.

### O5 — `/showcase` ships `three.js`
**Severity: low · Audit F8**

~1,500 LOC and a 908-line stylesheet, sole consumer of `three`, `@react-three/*` and
`framer-motion`. Route-level splitting keeps it out of the product bundle; it is in every
install and build. Untouched by the redesign. A decision, not a defect.

### O6 — Teacher records still live in one browser
**Severity: medium · Requirement H6 · Partly mitigated**

`localStorage` only, and the redesign added Exercises, plans and Command records to it.
Settings now warns before the quota is reached rather than after, which prevents the
silent failure — a save throwing while the board carries on working perfectly. It does
not solve the underlying limitation: records still do not follow a Teacher to another
laptop, and clearing site data still clears them. A ground-station-backed record is the
eventual answer and needs its own ADR, because it opens a second write path with its own
authority and conflict questions.

### O7 — One transient test failure, not reproduced
**Severity: watch**

`FleetProvider > brings the Fleet into contact` failed once during task 7.1 and passed on
three subsequent full runs and three isolated ones. It ran concurrently with a `tsc`
invocation at the time, so the likeliest explanation is timer starvation under load rather
than a real race. Recorded rather than dismissed: if it returns, the fake-timer advance in
that test is the first place to look.

### O8 — An empty `dashboard/` directory persists on disk
**Severity: cosmetic**

A file handle blocked `rmdir` after the contents were removed. Git is clean and does not
track empty directories, so it affects nothing but a directory listing.

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

## Verification method

Two rules applied throughout, and both earned their place:

**A guard is not trusted until it has been seen to fail.** The `fleet-core` Node guard
passed its first version while permitting exactly what it forbade. Nothing since has been
believed on the strength of a green run alone.

**New coverage is mutation-checked.** Each of the nine history-merge tests was run against
a deliberately broken copy of the behaviour it covers; every mutation failed exactly its
own test and no others. A test that passes against both the correct and the broken
implementation is not coverage.
