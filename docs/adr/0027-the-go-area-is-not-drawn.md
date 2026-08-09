# The go-area is not drawn, only the no-go areas

`ZoneKind` loses `'mission'`. A Teacher draws No-fly Zones and nothing else, any number of
them, which the type already allowed.

## What the Mission Zone was for, and why it is not needed

The Mission Zone was a polygon a Teacher drew around the area the class was meant to fly
inside. It fed one success criterion, one Alert, and a dashed orange outline on the Scope.

The class flies inside a physical net cage. The cage is the boundary: it is four metres of
netting a child can see, walk up to and touch, and it does not move when a Teacher drags a
corner. Drawing a second boundary inside the software told a Teacher something they could
already see out of the window, and cost them a step of set-up to say it.

Worse, the two could disagree. A Mission Zone drawn slightly small reported a breach for a
Drone that was safely inside the netting, which teaches a class to ignore the board.

## What this does not change

[ADR-0019](./0019-the-flight-area-is-drawn-in-the-local-frame.md) is not reopened. A zone is
still drawn in the Fleet's own frame, in metres east and north of where the Fleet was set up,
and that is still the safety argument: a zone shares its origin with the Drone positions, so
"inside this polygon" is a relative claim and survives an origin that is wrong. There is still
no GPS, no map tile and no network in this feature.

All of that now applies to **No-fly Zones only**. They are the zones that earn their width,
because a no-fly area genuinely is invisible: it is the corner under the basketball hoop, or
the strip in front of the doors, and nothing in the room marks it.

## The two knock-ons

**The success criterion changes name.** *No zone breach* becomes *No no-fly breach*. The
criterion was already only ever counting no-fly entries; the old name implied it also watched
the go-area, which it never did once a Mission Zone was optional.

**Step 3 loses its lock reason.** It read *Draw the Mission Zone first*, and there is no
Mission Zone to draw. Step 3 is *Teams and Drones*, and what it actually needs is a Scenario,
because the Scenario decides how many craft the Mission wants. The lock becomes *Choose a
Scenario first*, which is the same reason step 2 gives, and both are true: after this change
steps 2 and 3 are open under the same condition, and saying so twice is more honest than
inventing a second gate to justify the ordering.

## What could have gone differently

**Keep the Mission Zone and make it optional.** It already was optional, and that is how the
disagreement above got in: some Lessons had one and some did not, so `no zone breach` meant
two different things on two days. An optional boundary is worse than no boundary.

**Replace it with a numeric radius.** Rejected for the same reason as the polygon. The cage
has a shape and a number is not it, and a Teacher would be typing a measurement of a room they
are standing in.
