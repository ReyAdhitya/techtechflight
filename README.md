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

## Status

Design and decisions only. No implementation yet.
