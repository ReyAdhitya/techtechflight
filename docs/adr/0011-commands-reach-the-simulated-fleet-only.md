# Commands reach the simulated Fleet only, and a real Telemetry Source refuses to carry them

The board gains a command path. It can ask a Drone to land, to hold, to stop. Those requests
travel to the ground station over the same socket that carries Fleet State, and the ground
station passes them to the Telemetry Source — **which accepts them only if it is a
simulation.** A Telemetry Source backed by real hardware refuses at the seam, and there is
no configuration that changes that.

This amends the rule stated in `contract/src/index.ts`: *"there is deliberately no message
in the other direction, and a demonstration affordance must not become one."* That sentence
has been true since ADR-0003 and is now too absolute to keep as written. Its **reasoning** is
not amended, and is what shapes everything below.

## Why the original rule existed, and what survives of it

Three reasons, and they are not the same reason:

1. **No protocol exists.** Nobody has told us how a command is addressed to an aircraft,
   what acknowledges it, or what happens to one in flight when the link drops.
   All three questions are still open, and are recorded in
   [ADR-0022](./0022-return-home-is-a-terminating-command.md).
2. **Safety.** These are real aircraft, flown by children, in a room. Emergency stop and
   auto-landing are not features; they are the behaviour of a machine that can hurt someone.
3. **Architectural drift.** A command path is exactly the kind of thing that arrives as a
   demonstration affordance and stays as an API. `ground-station/src/main.ts` binds the demo
   scenario keys to the ground station's own **stdin** for precisely this reason, and that
   choice should be read as a warning rather than as an accident.

Reasons 1 and 2 are facts about **hardware**. They say nothing whatever about a simulation,
where the protocol is a method call and the aircraft is a number in a `Map`. Reason 3 is a
fact about **us**, and it survives completely — which is why the refusal below is a property
of the Telemetry Source rather than a flag someone can flip.

## What the goal actually requires

The product is being redesigned so a Teacher oversees a lesson the way a controller works a
sector. A controller who can only watch is not a controller. Without a command path the
oversight screens can rank what needs attention and can never let a Teacher act on it, and
the interaction design for acting — confirmation, authority, what happens when a command is
ignored — never gets built, tested, or learnt from before hardware arrives.

Building it against the simulator is how we arrive at the day the drone team answers with a
designed interaction rather than with a blank screen and a guess.

## The shape this constrains Phase 4 to

Recorded here because these are the properties that make the decision safe. A design that
drops any of them is a different decision and needs a different ADR.

**The capability belongs to the Telemetry Source, not to a setting.** ADR-0001 made the
Telemetry Source the sole boundary between hardware concerns and everything else. Commands
belong on that same seam: a *separate, optional* interface that `SimulatedTelemetrySource`
implements and a hardware source does not. `TelemetrySource` itself gains no command method.
A hardware adapter therefore cannot accept a command by forgetting to guard against one — it
can only accept a command by someone deliberately implementing the interface, which is a code
review, not a config change.

**The board never addresses a Drone.** Commands go to the ground station, which owns the
Fleet and decides. ADR-0003's seam is unchanged, and the board stays a static bundle that
knows nothing about radios (ADR-0005).

**A command is a request, never a fact.** The board must not optimistically update. It shows
what Telemetry subsequently reports and nothing else — the same rule that already stops an
inference dressing up as a measurement. A Drone that ignores a command must look exactly like
a Drone that ignored a command.

**The Teacher must never be uncertain which Fleet they are commanding.** Whatever the
interface looks like, it cannot be possible to press a button and then wonder whether a real
aircraft moved. This is a presentation requirement with the same standing as ADR-0004's rule
that colour is never the sole carrier of meaning.

**Emergency stop is not included by default in any future hardware work.** If a real source
ever becomes commandable, every command is a separate decision and this one is the hardest.
Cutting the motors on an airborne aircraft is not the safe fallback it sounds like.

## Considered options

**Stay read-only.** Rejected, but it was close. It is the honest, safe, already-mostly-built
option, and it is what the product is today. Rejected because it makes the stated goal
unreachable — and because the interaction design it defers is the part that will be hardest
to get right and most expensive to get wrong once aircraft are involved.

**Build the real command path now.** Rejected. There is no protocol to build against, the
Tier 0 question is open, and we would be inventing safety semantics — what a confirmation
means, who has authority, what a dropped link does to an in-flight command — from guesses.
Those semantics would then be the thing the drone team has to work around.

**One command path with a runtime flag or environment variable.** Rejected, and this is the
option worth naming explicitly because it is the one that looks most reasonable. A flag is a
thing a person flips, under time pressure, in a school, to make a demonstration work. The
refusal has to be structural or it is not a refusal.

**Commands that act on the board's own copy of the Fleet.** Rejected. It would mean the board
holding state the ground station disagrees with, which is the exact divergence the
whole-snapshot design in `contract` was built to make impossible.

## Consequences

`contract/` gains a message travelling from board to ground station — the first ever. The
`ServerMessage` union stays what it is and a new union sits beside it, so the two directions
are never confused for one another.

The comment at `contract/src/index.ts` must be **rewritten, not deleted**. Its reasoning is
still the constraint; only its absoluteness is now wrong. Deleting it would lose the argument
that keeps the next person from wiring a hardware source to a button.

`ground-station/src/main.ts`'s stdin scenario keys become redundant once the interface covers
the same ground. They should stay until it does, and their comment — which explains why they
are on stdin — should outlive them by moving somewhere it stays true.

ADR-0001's seam gains an optional second half. That ADR's central claim, that adding real
hardware means writing one new implementation of one interface, is unchanged: a hardware
adapter implements `TelemetrySource` and simply does not implement the other one.

The simulator stops being only a stand-in for missing hardware and becomes the thing the
control interaction is designed against — which is what ADR-0001 said it was for.

## When this ADR is wrong

When the drone team answers the command-protocol and safety questions. At that point a real
source may become commandable, and that needs a **successor ADR** rather than an edit to this
one — the reasoning here is specifically that hardware has not been specified, and a decision
made under that condition should not be quietly retitled once the condition lifts.

It is also wrong if the simulated command path turns out to teach us nothing transferable —
if the interaction we design against a `Map` of numbers bears no relation to commanding an
aircraft. That would be visible early, in Phase 7, and is worth watching for.
