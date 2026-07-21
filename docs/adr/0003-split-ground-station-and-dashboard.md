# Ground station and dashboard are separate programs, and we are not using Next.js

The system is two pieces: `ground-station/` (Node + TypeScript) owns the drone
connections and serves a WebSocket, and `dashboard/` (Vite + React + TypeScript) is a
pure view over that stream. They share only type definitions.

Next.js is the obvious choice for a React app and we deliberately rejected it. The
ground station's entire job is holding **persistent connections** — a socket or serial
port open for the length of a lesson, tracking which drones have gone quiet. That is
precisely what a serverless target cannot do, and reaching for Next.js would have
quietly pulled the architecture toward something incapable of the one thing the product
exists to do.

## Consequences

The dashboard is a static bundle that knows nothing about radios or protocols, so it can
be hosted anywhere later by repointing one WebSocket URL. It also means the UI is fully
testable with no hardware and no drone-domain knowledge. The cost is two package.json
files and a shared types package instead of one project.
