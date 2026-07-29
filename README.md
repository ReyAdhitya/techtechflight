# TechTech Flight

A ground-station dashboard that shows a school teacher the current state of every drone
in their classroom set, so they can tell at a glance which ones are usable before a
lesson starts.

Built by TechTech Technology, who sell STEM curriculum and drones to schools.

## Where the thinking lives

- **[CONTEXT.md](./CONTEXT.md)** — the domain glossary. The words this project uses, and
  the ones it deliberately avoids. Read this first.
- **[docs/adr/](./docs/adr/)** — architecture decision records. Why the system is shaped
  the way it is, including the decisions that look wrong until you know the reason.
- **[docs/questions-for-drone-team.md](./docs/questions-for-drone-team.md)** — open
  hardware questions. None of them block dashboard work; that is the point of ADR-0001.
- **[design.md](./design.md)** — the design system: Tech Tech Technology's warm paper
  neutrals and two-step marigold, shared with the Proposal Console. Sections 1–8 are the
  shared system; section 9 records what the Fleet board adds. See ADR-0009 for why we
  moved off the CrewAI system, and ADR-0006 for the Status colours, which the shared
  system does not define and which are kept and re-checked against the new canvases.

## Related work

`ReyAdhitya/flighttech2` is an existing prototype fleet GCS covering the same problem —
FastAPI backend, MQTT transport, mock drone simulator, React/MapLibre Mission Control
dashboard. Its architecture independently matches the decisions recorded here. Check it
before building anything twice.

## Running it

**Classroom (Windows, no terminal):** double-click **`Start TechTech Flight.bat`**.
That starts the ground station on **:4321** and opens the board. Default Fleet is the
**Simulator**. Radio (MAVLink) is advanced / monitoring-only — see ADR-0011.

**Developers:**

```bash
npm install
npm run dev:ground-station   # simulated Fleet + WebSocket on :4321
npm run dev:web              # the board on :3000
```

The ground station prints a set of demo keys on start — press `f` for a Fault, `l` to
drop a link, `t` to take off, `p` to put a Drone on charge, and so on, so a demonstration
never has to wait for one.
Building the board (`npm run build --workspace=web`) makes the ground station serve it
too, so the whole thing is one process on one laptop.

```bash
npm test        # both seams, one runner
npm run typecheck
```

## Layout

- **`contract/`** — the types both programs share, and nothing else. `Drone`, `Status`,
  `Telemetry`, `FleetState`, `TelemetrySource`, `Clock`.
- **`fleet-core/`** — owns the Fleet: derives Status, ages Telemetry into Stale and then
  Offline, forecasts a return to Ready, records what happened, and ships the simulated
  Telemetry Source (ADR-0001). No Node APIs, so the same code runs on a laptop and in a
  Teacher's browser (ADR-0013).
- **`ground-station/`** — the Node half: one WebSocket carrying Fleet State, and the
  static board served beside it.
- **`web/`** — a pure view over Fleet State. Next.js exported as static files, so it is a
  bundle with no server behind it (ADR-0005). Carries the light theme (ADR-0006).

## Status

The Fleet status board of [issue #1](https://github.com/ReyAdhitya/techtechflight/issues/1)
is implemented against the simulated Telemetry Source. No real hardware adapter yet — that
is one new implementation of `TelemetrySource` and nothing else.

A Not Ready Drone also says when it is expected back ("Ready in ~12 min"), derived only
from charge the ground station has watched go in — see ADR-0007 for why it stays silent
rather than guessing. The board carries a large format for a projector or a room read
from a distance, on a type scale that now follows the Teacher's own browser setting
(ADR-0008).
