# The Fleet core runs in the browser as well as on the ground station, and simulation plugs in beneath it

The code that owns the Fleet — Status derivation, ageing into Stale and Offline, the charge
forecast, event history, and the simulated Telemetry Source — moves out of `ground-station/`
into a new workspace that has no Node dependencies. The browser constructs the same objects
the Node process does, so a board with no ground station behind it shows a Fleet that
genuinely behaves rather than a fixture that is restamped.

`ground-station/` keeps what is actually Node: the HTTP server, the WebSocket, the process.

## Why

Audit finding F5. The deployed board today is six hard-coded `DroneState`s in
`web/lib/scenarios.ts`, re-anchored every two seconds. Altitude is a literal, so the vertical
rate is always zero, so the `climbing` and `descending` phases are **unreachable**; separation
never changes; the scope is a still frame; endurance never resolves because charge never
moves. Every derivation the oversight work exists to perform is invisible on the only build
anyone can look at without running a Node process.

Meanwhile `SimulatedTelemetrySource` — 487 lines that chase altitude toward a target, drift
within room bounds, derive per-motor thrust from attitude, measure a rangefinder against real
geometry, and drain and charge a battery — sits where the deployment cannot reach it.

## This is a move, not a port

Verified rather than assumed: Node APIs appear in exactly two files.

| File | Node APIs |
|---|---|
| `ground-station/src/main.ts` | `node:fs`, `node:url`, `node:path`, `process` |
| `ground-station/src/server.ts` | `node:http`, `node:fs/promises`, `node:path` |
| `fleet.ts`, `status.ts`, `charge.ts`, `history.ts`, `simulator/*` | **None** |

The Fleet core imports `@techtechflight/contract` and itself. Time is already injected as a
`Clock` rather than taken ambiently, and randomness is already injectable — both because the
tests demanded it, and both of which are exactly what a second runtime needs. The seam this
ADR relies on was built years of decisions ago, for other reasons, and holds.

## The two seams, and why they are different

This is the part worth being precise about, because the requirement handed to this phase was
*"the UI must communicate through Telemetry Source interfaces"* and taking that literally
would be a mistake.

A board must never consume raw observations. Status is derived by whatever owns the Fleet and
never by a board — that is an existing invariant, stated in `contract/src/index.ts`, and its
reason is that two boards on one Fleet must not disagree about what they are looking at. If a
screen consumed a `TelemetryObservation` it would have to derive Status itself, and we would
have two implementations of the most fragile logic in the product.

So there are **two** seams, at different heights, and they are orthogonal:

```
┌──────────────────────────────────────────────────────┐
│  Screens                                             │
│    read a FleetSnapshot. Cannot tell where it came   │
│    from, and must not be able to.                    │
├──────────────────────────────────────────────────────┤
│  Seam 2 — FleetLink                                  │
│    SocketFleetLink  │  LocalFleetLink                │
│    (over a socket)  │  (in this browser)             │
├──────────────────────────────────────────────────────┤
│  Fleet core                                          │
│    Status, ageing, charge forecast, history.         │
│    ONE implementation, both runtimes.                │
├──────────────────────────────────────────────────────┤
│  Seam 1 — TelemetrySource            (ADR-0001)      │
│    SimulatedTelemetrySource  │  HardwareSource       │
└──────────────────────────────────────────────────────┘
```

**Seam 1** decides where Telemetry comes from — a simulation or an aircraft.
**Seam 2** decides where the Fleet core is running — in this browser, or across a socket.

The requirement is honoured more completely by this than by the literal reading: swapping a
simulation for real hardware changes an implementation of seam 1 and touches neither the
Fleet core nor a single component.

## What each configuration is for

| Configuration | Seam 2 | Seam 1 | Used for |
|---|---|---|---|
| Browser simulation | Local | Simulated | The Vercel deploy, and `/demo`. A Fleet that genuinely behaves with no server |
| School, today | Socket | Simulated | A ground station on a laptop, before aircraft exist |
| School, later | Socket | Hardware | Real Drones |
| — | Local | Hardware | **Impossible, and impossible by nature.** A browser cannot reach a radio |

The fourth row is the safety property that makes this ADR compatible with
[ADR-0011](./0011-commands-reach-the-simulated-fleet-only.md). A browser-hosted Fleet core is
necessarily a simulated one, so putting the Fleet core in the browser can never put a
Teacher's browser in command of an aircraft.

## Considered options

**Reimplement Status derivation in the browser.** Rejected outright. Stale and Offline are
the most fragile logic in the product — `contract/src/index.ts` says so, which is why `Clock`
is injected at all. Two implementations would disagree, and they would disagree in front of a
class. This is the option that looks cheapest and is worst.

**Animate the fixtures.** Move `scenarios.ts` from static values to values that change on a
timer. Rejected: it produces movement without behaviour. A battery that ticks down without a
model does not reach a usable threshold, and Status derived from invented numbers is theatre.
It would also be a *third* thing that knows how a Drone behaves.

**Run the ground station in a Web Worker / WASM / a service worker.** Rejected as complexity
bought for nothing. The Fleet core is pure TypeScript with no Node dependencies; it needs no
sandbox, and a Fleet of six Drones ticking once a second is not a workload.

**Keep the simulator in `ground-station/` and import it into `web/` by subpath.** Rejected
for honesty rather than for mechanism — it would work. A package named `ground-station`
imported by a browser bundle misdescribes what it is, and the next person would reasonably
assume `web/` had taken a dependency on a server.

## Enforcement

Rules that are only conventions get broken by the next person in a hurry.

1. **The new workspace has no Node dependencies**, and gains none. A `node:` import in it is a
   build failure in `web/`, which is the check working rather than an inconvenience.
2. **No teacher-facing component may import the simulator.** An import boundary — lint rule
   or dependency check — forbids `web/components/**` and `web/app/**` from reaching the
   simulator package at all.
3. **Exactly one place knows a Fleet is simulated:** the provider that chooses the link. It
   publishes a single boolean for presentation. No screen branches on which link it has.
4. **`isCommandable()` remains the only route to a Command**, per ADR-0011. A hardware source
   does not implement the interface and therefore cannot be reached by one.

## Consequences

A new workspace, provisionally `fleet-core/`. Its tests move with it — `fleet.test.ts`,
`history.test.ts`, and the simulator's — and become a fourth Vitest project as `dashboard`'s
retires under ADR-0010.

`web/lib/scenarios.ts` loses its reason to exist for the demo path. It may survive for
`/showcase`, which is a design comparison rather than the product.

`web/` gains the Fleet core in its bundle: pure TypeScript, no dependencies, and only on the
routes that use it. The board still exports statically and still needs no server, so ADR-0005
is untouched.

The demonstration stops being a separate artifact that can drift from the product. What a
visitor sees on Vercel is the real Status derivation, the real ageing, the real charge
forecast and the real event history — which is the strongest argument for this change and was
not the reason for making it.

`ground-station/` becomes small and honest: a transport and a process around a core it no
longer owns. ADR-0003's split survives; the line simply moves to where the Node dependency
actually is.

## When this ADR is wrong

If the Fleet core ever needs something a browser cannot do — a filesystem for persistence, a
real socket, a native module. That would be visible immediately as a `node:` import failing
to bundle, which is why rule 1 above is load-bearing rather than tidy.

It is also wrong if browser and Node runtimes ever produce *different* Fleet States from the
same inputs. That would mean the core had acquired an ambient dependency — a real clock, a
locale, a timezone — and the fix is to inject it, not to fork the core.
