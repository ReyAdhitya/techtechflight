# A No-fly Zone has no ceiling, so it is drawn on every view

A No-fly Zone renders on **Top-down, Side and Front**. On the two elevation views it is a
full-height band across the heights the view can show, because that is what the zone is.

This changes one paragraph of
[ADR-0019](./0019-the-flight-area-is-drawn-in-the-local-frame.md). Everything else in that
decision stands: zones are still polygons in the Fleet's own local frame, there is still no
GPS and no map tile, and the safety argument is still that a zone and a Drone share one
origin so "inside this polygon" is a relative claim.

## The paragraph that was wrong

ADR-0019 ends its consequences with:

> `Scope.tsx` gains polygons beside the link ties and conflict lines it already draws,
> top-down only — a zone is a plan-view fact and drawing it on the Side or Front view would
> assert a vertical extent nobody has drawn.

The reasoning was careful and it was about the wrong object. It assumed a zone might have a
ceiling that the Teacher had not been asked for, so that drawing one would be the board
inventing a reading. But there is no ceiling to invent. `Zone` carries a polygon and nothing
else: no floor, no ceiling, no height at all. `breachesAt` tests the horizontal position and
ignores altitude entirely, which it has done since the day it was written.

So the vertical extent is not undrawn. It is **everywhere**, and always was. A Drone at
0.2 m over a No-fly Zone is in breach and a Drone at 3 m over the same polygon is in breach,
and the board raises the same Alert for both.

That is also the physical truth of the room this product is used in. The class flies inside a
net cage about three metres high (ADR-0027). You cannot fly over the netting, and you cannot
fly over the corner of the hall where the PE equipment is stacked, which is the kind of thing
a No-fly Zone is actually drawn around. A column of air, floor to net, is not an approximation
of a No-fly Zone. It is one.

## What was on screen instead

Nothing. A Teacher watching the Side view saw a Drone cross a zone with no mark on the picture
to say so. The Alert still fired on the strip, so the board was simultaneously saying *no-fly
breach* in one place and drawing an empty sky in another.

Given a choice between a picture that asserts a full-height column and a picture that asserts
clear air, the second is the less honest one, because it is the one a Teacher acts on. Nobody
scans a view to confirm the absence of a boundary they were not shown.

## What is drawn

| View | Horizontal axis | The zone |
|---|---|---|
| Top-down | east | the polygon, hatched and named, as before |
| Side | north | a band spanning the polygon's north extent, full height |
| Front | east | a band spanning the polygon's east extent, full height |

The band is the polygon's **extent** on that axis rather than its outline, because an
elevation view has already flattened one dimension. A concave zone projects to a band that is
wider than the zone at some depths, and that error is in the safe direction: it claims more
forbidden air than there is, which over-warns rather than under-warns. It is drawn with the
same hatch and the same name, so a Teacher reading three views reads one object.

## Considered options

**Leave it top-down only.** Rejected above. It is the incumbent and it silently disagrees with
the Alert the same board raises.

**Draw the outline projected onto the elevation, rather than a band.** Rejected. The
projection of a polygon onto one axis *is* an interval; drawing it as an outline would invent
a shape with a top and a bottom, which is the thing ADR-0019 was right to refuse.

**Ask the Teacher for a ceiling per zone.** Rejected. It is a fifth thing to draw during
set-up, in a product whose set-up is deliberately five steps, and the answer would be "the top
of the net" every time. If a school ever flies outdoors without a cage, that is the ADR that
reopens this.

## Consequences

`ScopeZones` gains the two elevation cases. `web/lib/airspace.ts` is untouched: no geometry
changes, because no geometry was ever vertical.

The Scope draws a fixed window (ADR-0014) and a zone can be drawn outside it. On Top-down that
was already possible and already invisible; adding two more views does not make it worse, but
it does make it worth saying, so the Lesson screen now names any zone that falls outside the
window rather than letting a Teacher draw something they will never see.

## When this ADR is wrong

When a zone acquires a height. If a Teacher can ever say *"no flying below one metre over the
seating"*, a full-height band stops being the truth and starts being an over-warning that
hides a real distinction. `Zone` would gain a floor and a ceiling, `breachesAt` would read
altitude, and this decision would be replaced rather than amended.
