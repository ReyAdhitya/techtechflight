# The scope gets a front view, same box, same elevation rules

The scope draws three pictures of the same Fleet: **Top-down**, **Side** (height against
**north**), and **Front** (height against **east**). A labelled toggle swaps between them.
One is showing at a time.

Numbered 0017. Builds on [ADR-0016](./0016-a-side-view-on-the-scope.md).

Axes were swapped 2026-07-28 (#38): the classroom Fleet parks on `eastM: 0,1,2…` at
`northM: 0`, so Front must use **east** horizontally or the whole row stacks in one place.

## Why a third view

Side answers *are those two at the same height* along the north–south line. It cannot separate
two Drones that share a northing and differ only in east — they stack on the same vertical
line in Side.

Front is the elevation that matches the classroom row: **east × altitude**. Same question
Side asks, on the axis the parked set actually uses.

| View | Horizontal | Vertical |
|---|---|---|
| Top-down | East | North |
| Side | **North** | Altitude |
| Front | **East** | Altitude |

## Why the same rules as Side

Everything ADR-0016 decided for elevation still holds: equal metre scale (viewBox and aspect
agree), shared ceiling ladder `[2, 4, 8]` that grows and never shrinks, heightless craft named
not grounded, no conflict or link lines, default top-down, choice not persisted, one box with
a toggle (ADR-0014's height budget).

Front differs only in **which floor coordinate drives `x`**. The window is still square, so
east span = north span = `sideM`; Front and Side share the same aspect-ratio shape.

## Why this supersedes ADR-0016's "any third view"

ADR-0016 closed the door on a third view before the product asked for the other elevation.
That exclusion is withdrawn here. The reasoning that forbade stacking a second *box* still
stands — Front is still one toggle, not a second picture on screen.

## Out of scope, deliberately

**Conflict and link lines on Front** — same reasoning as Side.

**FPV / camera feed.** This is a geometric elevation, not a video.

**Persisting the choice.** Top-down on every load.

## When this ADR is wrong

If Teachers never open Front because Side already answered every height question they ask —
then the third pill is noise. Or if they constantly swap Side ↔ Front to compare the same
pair, that is evidence for both elevations on screen at once, and the answer would be a
wider layout that still respects ADR-0014.
