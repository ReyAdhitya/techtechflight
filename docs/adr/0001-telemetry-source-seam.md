# The dashboard reads from a swappable Telemetry Source, and the simulator is permanent

The aircraft does not exist yet, so the dashboard had to be built against invented data.
Rather than build a throwaway mockup and rewrite it later, we defined a single
`TelemetrySource` seam: everything upstream of it (radio, wire format, protocol) is
replaceable, and everything downstream of it (status model, UI) never knows the
difference.

The simulator is not scaffolding to be deleted once hardware arrives. Drones are
expensive, slow to charge, and cannot be flown at a desk — we will want to develop,
test, and demo this without spinning props for the life of the product. The simulator
is a first-class Telemetry Source that ships.

## Consequences

Any drone-specific concept that leaks past the seam into the dashboard is a bug. If the
UI ever needs to know what radio is attached, the seam is in the wrong place.
