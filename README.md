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
- **[crewai.design.md](./crewai.design.md)** — the design system, in Google Labs'
  DESIGN.md format. See ADR-0004 for the deviations we make from it deliberately.

## Related work

`ReyAdhitya/flighttech2` is an existing prototype fleet GCS covering the same problem —
FastAPI backend, MQTT transport, mock drone simulator, React/MapLibre Mission Control
dashboard. Its architecture independently matches the decisions recorded here. Check it
before building anything twice.

## Running it

```bash
npm install
npm run dev:ground-station   # simulated Fleet + WebSocket on :4321
npm run dev:dashboard        # the board on :5173
```

The ground station prints a set of demo keys on start — press `f` for a Fault, `l` to
drop a link, `t` to take off, and so on, so a demonstration never has to wait for one.
Building the dashboard (`npm run build --workspace=dashboard`) makes the ground station
serve it too, so the whole thing is one process on one laptop.

```bash
npm test        # both seams, one runner
npm run typecheck
```

## Layout

- **`contract/`** — the types both programs share, and nothing else. `Drone`, `Status`,
  `Telemetry`, `FleetState`, `TelemetrySource`, `Clock`.
- **`ground-station/`** — owns the Telemetry Source, derives Status, ages Telemetry into
  Stale and then Offline, serves Fleet State over one WebSocket. Ships with the
  simulated Telemetry Source (ADR-0001).
- **`dashboard/`** — a pure view over Fleet State. Knows nothing about radios or
  protocols.

## Status

The Fleet status board of [issue #1](https://github.com/ReyAdhitya/techtechflight/issues/1)
is implemented against the simulated Telemetry Source. No real hardware adapter yet — that
is one new implementation of `TelemetrySource` and nothing else.
