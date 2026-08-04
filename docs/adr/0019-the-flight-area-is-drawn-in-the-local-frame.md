# The flight area is drawn, and it is drawn in the local frame

The Teacher can draw a **Mission Zone** and any number of **No-fly Zones**, as polygons in
metres east and north of the point the Fleet was set up. Zones render on the Scope, breaches
raise an Alert, and violations cost a Mission its score.

This **supersedes the deferral** in
[ADR-0012](./0012-the-mission-planner-plans-people-and-exercises-not-the-room.md). That ADR
wrote its own release condition and this decision meets a different one than expected, so the
argument is set out in full rather than asserted.

## Why ADR-0012 refused, and why the refusal does not apply

ADR-0012's reasoning is one sentence, and it is a good one:

> Separation alerts survive that uncertainty because they are *relative* — two Drones being
> 0.4 m apart is true whatever the origin. A no-fly zone is *absolute*, and is wrong by exactly
> as much as the origin is.

That is correct about a zone anchored to the **world**. It is not correct about a zone anchored
to the **same origin the Drone positions are anchored to**, which is what is built here.

A zone drawn in the local frame and a Drone reported in the local frame share their error. If
the setup point is three metres from where anyone thinks it is, the zone is three metres off
*and so is every Drone*, in the same direction, by the same amount. "Is this Drone inside that
polygon" is then exactly as true as "are these two Drones 0.4 m apart" — a relative claim, and
survivable for the identical reason.

So the zone is not absolute. ADR-0012 anticipated a world-anchored flight area and refused it;
this is a Fleet-anchored one, and the refusal does not reach it.

## What is still true, and is said on screen rather than hidden

The error does not vanish; it moves. A zone drawn to line up with a **physical** thing — the
edge of the netting, the wall, the row where the class sits — inherits the origin error in full,
because the wall is in the world and the origin is a guess about where the world is.

Two consequences, both load-bearing:

1. **A zone is a boundary in the Fleet's own frame, not a survey of the room.** The Teacher
   draws it by looking at where the Drones actually are on the Scope, not by measuring the hall.
2. **On a hardware Fleet the zone says so.** Where the Telemetry Source is not the simulator,
   zones render with *"not surveyed against this aircraft"*. The line is drawn, the Alert still
   fires, and the Teacher is told what the line is worth. This is the same class of honesty as
   ADR-0007's silence about a charge nobody watched go in, and the same rule as ADR-0011's
   *"the Teacher must never be uncertain which Fleet they are commanding"*.

In the simulator the geometry is exact — the aircraft is a number in a `Map` — so there is no
caveat and none is drawn.

## No map tiles, no GPS, no coordinates on the planet

`LocalPosition` stays metres east and north. Nothing gains a latitude.

- **Map tiles were considered and rejected.** They need the internet at the moment of use, and
  [ADR-0002](./0002-local-first-ground-station.md) exists because school networks are locked
  down and often have no internet where the flying happens. A feature that degrades to a grey
  rectangle in exactly the conditions the product was built for is not a feature.
- **The laptop's geolocation was considered and rejected.** It reports where the *laptop* is,
  to twenty or fifty metres, which is neither where the Drone is nor accurate enough to place a
  boundary. It would add a permission prompt, a secure-origin requirement, and a number that
  looks authoritative and is not.
- **Real ATC does not use photography either.** A radar display is vector — boundaries, fixes,
  sector lines on a plain field — because an aerial photograph is visual noise competing with
  the targets. The existing Scope is already the right kind of picture.

A Teacher who wants their field on screen may supply **their own image** and scale it by typing
its real width in metres. Their file, their laptop, no network, no attribution obligation, and
it sits under the grid at low contrast so it never competes with a Drone mark.

## The window is still not the boundary

[ADR-0014](./0014-a-fixed-scope-window.md) closes by naming the exact failure to avoid:

> the display window either becomes it or is clearly distinguished from it. Merging the two
> silently is the failure to avoid.

It is distinguished, and testably so. The window is chosen from the ladder
`[8, 12, 16, 24, 32]` by where the Drones are; a zone is chosen by the Teacher. The window has
no fill, no name, and nothing derives from it; a zone is named, hatched, and raises Alerts. A
Drone beyond the window is held at the edge and named in the caption; a Drone beyond a zone is
a breach. `roomExtent()` still knows nothing about zones, and `web/lib/airspace.ts` still knows
nothing about the window.

The fixed classroom geofence in `web/lib/classroom-geofence.ts` — four constants, drawn dashed,
alerting on nothing — is superseded by a real Mission Zone and goes.

## Considered options

**Stay deferred.** Rejected, but it was the incumbent and deserves the credit. It is honest and
it is free. It also leaves the product unable to answer the question the customer's own workflow
puts at step 2 of 12, and leaves *no-fly violation* — one of the five failure conditions the
scenarios are scored against — permanently unimplementable.

**Draw zones and enforce them identically on real hardware, with no caveat.** Rejected. It is
the option that demonstrates best, and ADR-0012 already noted that being the most demonstrable
option is not a reason. A Teacher who believes a line is surveyed when it is not is worse off
than one who has no line, because they will stop watching the netting themselves.

**Wait for the drone team to confirm the origin is stable.** Rejected as answering a question
this design does not ask. Origin stability matters for a world-anchored zone; a Fleet-anchored
one needs only that the Drones agree with *each other*, which is the same assumption separation
alerts have shipped on since the beginning.

**Promote the simulator's `ROOM` to the contract.** Rejected for the reason ADR-0014 already
gave: four numbers invented so a simulated rangefinder has walls to find are a property of the
simulation, and promoting them models the room by the back door.

## Consequences

`web/lib/airspace.ts` becomes the only place polygon geometry lives — point-in-polygon,
distance to edge, and breach as a rising edge rather than a level, so a Drone hovering on a line
raises one Alert and not forty. It is pure and fully covered by tests, which matters on a
suite that cannot see layout.

`web/lib/vitals.ts` gains a `no-fly` Alert kind. Its severity is `critical`, and it names the
response options rather than the condition, as every Alert already must.

`Scope.tsx` gains polygons beside the link ties and conflict lines it already draws, top-down
only — a zone is a plan-view fact and drawing it on the Side or Front view would assert a
vertical extent nobody has drawn.

The open hardware question that ADR-0012 tracked in `docs/questions-for-drone-team.md` —
*how accurate is `LocalPosition`'s origin, does it survive a power cycle, and do two Drones
agree about it* — is recorded **here** now, that file having been retired. Only the third
clause still gates anything: Drones agreeing with each other is what both separation alerts and
zone breaches rest on.

## When this ADR is wrong

When two Drones are shown to disagree about the origin by more than the width of a zone.
Everything above rests on a shared frame; it does not rest on that frame being correctly placed
in the world, but it does rest on it being *shared*. That is a measurement anyone can make on
the first day there are two airframes on a bench, and it should be made.

It is also wrong if Teachers draw zones against physical features anyway — against the wall,
not against where the Drones are — in which case the caveat is not doing its job, and the
honest response is a survey step rather than a smaller footnote.
