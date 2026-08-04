# Return home is a Command, because its end state is on the ground

`CommandKind` gains **`return-home`**. A Teacher can Recall a Drone: it flies back to where it
took off and lands there. Like every other Command it reaches the simulated Fleet only, and a
hardware Telemetry Source still refuses it structurally
([ADR-0011](./0011-commands-reach-the-simulated-fleet-only.md) is untouched).

This needs an ADR because it looks like a violation of the rule written above the union in
`contract/src/index.ts`, and the next reader will delete it otherwise.

## The rule it appears to break

> Every Command reduces the aircraft's energy. Land, hold, auto-land, stop. There is no Command
> that makes a Drone do more than it is already doing, and taking off is deliberately not one —
> a Teacher does not launch a Student's Drone from across the room. That makes the whole
> surface fail safe by construction: the worst outcome of a mistaken Command is an aircraft
> that comes down when it did not need to.

Recall makes an aircraft fly somewhere. Read literally as arithmetic about joules, it fails.

## Why the rule's own test still passes

The rule states its purpose in its last sentence, and that is the part to check against: *the
worst outcome of a mistaken Command is an aircraft that comes down when it did not need to.*

Recall's worst outcome is precisely that. A Drone that is Recalled by mistake lands, at the
place it started, having flown a short path over ground the class already stood on. It cannot
climb, it cannot accelerate away, it cannot be sent somewhere new, and it cannot stay up. The
end state is on the ground, which is the same end state as `land` and `auto-land`.

"Reduces the aircraft's energy" was shorthand for **no take-off, no climb, no go-faster, no new
destination**. Recall breaks none of those. The prose is amended to say what it meant, because
a rule that has to be reinterpreted every time it is applied is a rule that will eventually be
applied wrongly.

It is worth being explicit about what *would* still be refused under the amended rule: a
`goto` or `waypoint` Command, which chooses a new destination and is a genuine expansion of what
the Teacher can make an aircraft do. Recall's destination is not chosen — it is the place the
Drone left, and it is the only place it can go.

## Why it is not simply `auto-land`

`auto-land` puts the Drone down where it currently is. In a classroom that is frequently the
worst available option: over the desks, on a Student's head, in the netting. The whole reason
the customer's workflow lists Recall separately from Land is that *where* an aircraft comes down
is a safety decision and the take-off point is the one place in the room known to be clear —
somebody stood there.

`auto-land` also has a name and a simulator implementation and no button anywhere in the
product today. Recall is the button that whole capability was waiting for.

## Considered options

**Make Recall an Instruction to the team, not a Command.** Rejected, and it is the option
[ADR-0021](./0021-clearances-and-instructions-are-records-not-commands.md) would otherwise
suggest. Recall belongs in the same emergency breath as Stop: it is used when a Student has
frozen, or is not listening, or the room needs the aircraft down now. An emergency action that
requires the person who is already failing to cope to carry it out is not an emergency action.
Reroute *is* an Instruction, because it is a plan change and not a rescue.

**Reuse `land` and let the simulator decide to fly home first.** Rejected. Two behaviours behind
one name means a Teacher cannot predict where the aircraft will touch down, which is the single
thing they are pressing the button to control.

**Wait for hardware before adding it.** Rejected for ADR-0011's own reason: the interaction
design for acting is the part that will be hardest to get right and most expensive to get wrong
once aircraft are involved, and it gets built against the simulator or not at all.

## Consequences

`SimulatedTelemetrySource` gains the behaviour: fly toward the home position at the ordinary
drift speed, then descend. It is not instant, so the Teacher watches it happen — and if it does
not happen, a Drone that ignored a Recall looks exactly like a Drone that ignored a Recall
(ADR-0011's rule, unchanged, and `command-tracker.ts` already carries `sent → waiting → done`).

`COMMAND_WORDS` gains `return-home: 'Recall'`, and the button joins Land / Hover / Stop in
`CommandRow`. It is enabled only while airborne, like Land.

The comment block above `CommandKind` is **rewritten, not deleted** — the same instruction
ADR-0011 gave about the comment it amended, for the same reason: the reasoning is still the
constraint, and deleting it loses the argument that stops the next person adding `goto`.

A hardware adapter still refuses. Nothing about `CommandableSource` changes, and if a real
source ever becomes commandable, Recall is a separate decision from Stop and from Land, as
ADR-0011 requires each of them to be.

## The hardware questions this decision is still waiting on

`docs/questions-for-drone-team.md` has been retired. Three of its questions were load-bearing
and are recorded here, because this is the decision they gate:

1. **Is the air-to-ground command protocol decided, and can the software side influence it?**
   Unanswered. MAVLink was adopted for *telemetry* (`fleet-adapters/`), which strongly suggests
   the answer, but reading a stream and being trusted to command an aircraft are different
   permissions.
2. **What acknowledges a Command, and how long may that take?** Unanswered.
   `command-tracker.ts` currently infers success from subsequent Telemetry over a ten-second
   window, which is a guess dressed as a design.
3. **What happens to an in-flight Command when the link drops?** Unanswered, and the most
   dangerous of the three. A Recall that is issued and then unheard is a different situation
   from one that is heard and then abandoned, and the aircraft's failsafe decides which.

Until all three are answered, `CommandableSource` stays unimplemented by any hardware adapter.
That is not a limitation of this ADR; it is the point of ADR-0011.

## When this ADR is wrong

If a classroom turns out to have no clear take-off point — if Drones launch from wherever a
Student is standing — then "home" is not a safe place and Recall is landing somewhere arbitrary
under a reassuring name. The check is whether take-off points and the pad are the same place.

It is also wrong if Recall gets used routinely, to end every flight, rather than in trouble.
That would make it a normal end-of-Mission action rather than an intervention, and it belongs on
a different part of the screen from Stop.
