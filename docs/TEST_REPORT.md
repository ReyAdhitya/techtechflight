# Test report

Phase 7, opened early and kept running. Findings are written down when they are found
rather than reconstructed at the end, because the ones worth having are the ones nobody
would remember to look for afterwards.

**Current state:** 272 tests passing across 17 files, three typechecks clean, the board
builds. Progress against the plan is in
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

### O1 — No device or desktop audit has been run
**Severity: high · Task 8.3**

Nothing in this redesign has been hit-tested on a phone or tablet. Two things are most
exposed: the **guarded press-and-hold** emergency stop, which depends on pointer events
that behave differently under touch, and the **command row**, which adds three controls to
a strip that already wraps. The plan calls for 8 device profiles and 3 desktop widths with
tap targets hit-tested rather than read off the CSS.

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

### O4 — `next/link` prefetch 404s under static export
**Severity: medium · Audit F7 · Task 8.5**

Every navigation link requests an RSC payload that does not exist in a static export. No
correctness impact, but each click pays full latency and the console is noisy — on a
projector, in front of a class.

### O5 — `/showcase` ships `three.js`
**Severity: low · Audit F8**

~1,500 LOC and a 908-line stylesheet, sole consumer of `three`, `@react-three/*` and
`framer-motion`. Route-level splitting keeps it out of the product bundle; it is in every
install and build. Untouched by the redesign. A decision, not a defect.

### O6 — Teacher records still live in one browser
**Severity: medium · Requirement H6 · Task 8.4**

`localStorage` only, and the redesign adds Exercises, plans and Command records to it. The
agreed mitigation is an export prompt at lesson close and a stored-size warning before a
quota failure rather than after. A ground-station-backed record needs its own ADR.

### O7 — An empty `dashboard/` directory persists on disk
**Severity: cosmetic**

A file handle blocked `rmdir` after the contents were removed. Git is clean and does not
track empty directories, so it affects nothing but a directory listing.

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

## Verification method

Two rules applied throughout, and both earned their place:

**A guard is not trusted until it has been seen to fail.** The `fleet-core` Node guard
passed its first version while permitting exactly what it forbade. Nothing since has been
believed on the strength of a green run alone.

**New coverage is mutation-checked.** Each of the nine history-merge tests was run against
a deliberately broken copy of the behaviour it covers; every mutation failed exactly its
own test and no others. A test that passes against both the correct and the broken
implementation is not coverage.
