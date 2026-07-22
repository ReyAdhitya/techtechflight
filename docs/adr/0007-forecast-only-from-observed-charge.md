# The board forecasts a return to Ready only from charge it has watched go in

A Not Ready Drone is the one Status the glossary defines as expected to resolve, so
"when?" is the obvious next question a Teacher has. `DroneState` now carries
`timeToReadyMs`, and the tile reads "Ready in ~12 min".

The number is derived from one thing only: battery readings the ground station has
actually seen rise, across several observations, over a window long enough for the rate
to mean something. Nothing asks a Drone whether it is on a charger.

## Considered options

**Ask the aircraft.** A `charging` flag in Telemetry would be simpler and more accurate.
Rejected because no Telemetry Source is known to be able to answer it — question 7 of
`docs/questions-for-drone-team.md` is still open on whether there is even a current
sensor — and a feature resting on a question the hardware may not be able to answer is a
feature that gets deleted. Inference costs nothing and makes no new hardware demand.

**Learn from history.** Where a School swaps packs rather than charging in place, the
honest forecast is a historical one: "this Drone usually comes back in about five
minutes." Rejected for now because it needs persistence the local-first ground station
does not have (ADR-0002), and because it forecasts the Teacher's habits rather than the
aircraft's state. Worth reopening if swapping turns out to be how Schools actually work.

## Why this shape survives either answer

We do not yet know whether Schools charge in place or swap packs — the question was
added to `docs/questions-for-drone-team.md` alongside this decision, and it does not
block anything, which is the point.

Where batteries charge in place, the readings climb and a forecast appears. Where they
are swapped, the readings show a step rather than a slope, no rate is ever derived, and
the board says nothing at all — which is the truth, because the charger is a device no
Drone can see. A swap is explicitly detected and discards the window rather than being
extrapolated from: how fast the pack that came out filled predicts nothing about the one
that went in.

So the answer to the hardware question changes how often this feature speaks, and never
whether it is honest.

## Consequences

Null is the resting value and by far the commonest one. Every consumer has to treat "no
forecast" as normal rather than as a loading state or a defect — the tile omits the line
entirely rather than rendering an empty one, so a Teacher never reads a blank where a
number goes and wonders whether it is still arriving.

The forecast is rounded to the minute it is displayed in, upstream of the dashboard. An
extrapolation does not deserve second precision, and an unrounded value would change on
every tick and republish the whole Fleet without a Teacher ever seeing it change.

Refusing to answer is a first-class result, and the thresholds that decide when to refuse
are configurable rather than tuned into the code. A forecast further out than about an
hour and a half is withheld: past that the extrapolation is fiction, and a Teacher with a
lesson starting learns more from silence than from "Ready in ~4 hr".
