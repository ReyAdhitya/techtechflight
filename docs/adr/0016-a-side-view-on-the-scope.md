# The scope gets a side view, in the same box, on the same scale

The scope draws **Top-down** and **Side** (height against a floor axis). A labelled toggle
swaps between them. One is showing at a time. As of [ADR-0017](./0017-a-front-view-on-the-scope.md)
/ #38, Side’s horizontal axis is **north** (Front takes **east** so the classroom row spreads).

Numbered 0016 rather than 0015 because
[ADR-0015](./0015-a-professional-register.md) took that number first.

## Why a second view at all

The top-down answers *which one is that* and *are two of them about to meet*. It cannot answer
**are those two at the same height**, which is the other half of the same question in a room
where six Drones fly at once.

Two marks a hand's width apart on the plan view may be three metres apart vertically and in no
danger whatever. Read the other way, a Teacher who sees them close reaches for a Command that
was never needed. Height is already on the board as a number — on each mark since W1d, and on
every flight strip — but a number is read one Drone at a time, and *"are those two level with
each other"* is a comparison. Comparisons are what a picture is for.

## Why one box with a toggle, and not two boxes

Because the alternative undoes a fix that is one week old.

`docs/adr/0014-a-fixed-scope-window.md` records the scope being capped at 600 px and centred,
because a square scope at full width was 1216 px tall and pushed every flight strip below the
fold — the strips being where a Teacher actually works. Stacking a second picture beneath the
first puts the height straight back, and would do it on the day this landed.

So: one box, one view, and a control to change which. The cost is that a Teacher cannot see
both at once, and that is the right cost to pay — the two answer different questions, and
neither question is asked while the other is being answered.

## Why the scale is shared, and why the box reshapes

**A metre up is the same length on screen as a metre across.** This is not a preference.

`Scope.tsx` already carries the scar: east and north were once normalised to 0–100
*independently* and the result forced into a 4:3 box, so a metre north and a metre east were
different lengths, and the one thing the picture exists to show could not be read off it. A
vertical axis stretched to fill the box is the identical defect rotated ninety degrees — it
makes two Drones look comfortably separated when they are a hand's width apart.

Equal scale is achieved by the **viewBox and the box's aspect ratio agreeing**: a 12 m window
under a 3 m ceiling gives a `0 0 12 3` viewBox in a 4:1 box. The box therefore changes shape
when the view changes.

That was the one genuinely ambiguous point in the specification, which offered both this and a
square box with the drawing letterboxed into its bottom quarter. The letterboxed version has a
real argument — a 3 m ceiling in a 12 m room *is* mostly empty air, and drawing it that way is
honest, and the page never reflows. It was rejected on two grounds:

1. **The ceiling ladder would have no observable effect.** Scaled by the window's width, the
   drawing looks identical whichever rung is chosen; only the empty space above it changes.
   A rule that changes nothing a Teacher can see is a rule nobody can check.
2. **It spends three quarters of a 600 px box on nothing**, which is hard to defend one week
   after capping that box specifically to stop the scope taking too much room.

The accepted cost: toggling to Side shrinks the box, so everything below it moves up. Shrinking
is the safe direction — it cannot reintroduce the problem ADR-0014 fixed.

## Why the ceiling has its own ladder

`[2, 4, 8]` metres, not the window's `[8, 12, 16, 24, 32]`. A classroom's useful heights and
its useful widths are not the same numbers: six Drones spread across 8 m of floor rarely go
above 2 m, and offering 8 m as the smallest ceiling would draw every lesson as a row of marks
along the bottom edge.

It is chosen and held exactly as the window is — the smallest rung that holds every Drone,
growing when one climbs past it, never shrinking while the scope is mounted. The reason is the
same reason: a Drone hovering on a rung boundary would otherwise flip the whole picture's scale
on every Fleet State, which is the drifting grid of ADR-0014 on the other axis.

## Why a Drone with no height is named rather than grounded

`Telemetry.altitudeM` is optional, and its absence means the airframe **cannot measure height
at all** — a different fact from measuring zero. `docs/DESIGN.md` §11.1 requires the two to be
drawn differently.

In a picture whose vertical axis *is* height, there is no honest place to put a Drone that has
no height. Putting it on the ground line states that it is landed. Putting it anywhere else
invents a number. So it is left out of the drawing and named in the caption — *"Drone 4 does
not report a height"* — which is the same answer W1 gave to a Drone beyond the window's edge,
for the same reason: **a Drone that silently vanishes from the scope reads as a Drone that is
not flying.**

It is still drawn on the top-down, where height is not what is being shown.

## Why the ground line is not the flight area

ADR-0012 defers the flight area and `docs/DESIGN.md` §4.3 says *"no room outline, no zones, no
boundaries"*. A horizontal line across the bottom of a picture looks like a floor, so the
distinction has to be stated or it will be mistaken for a violation, exactly as ADR-0014 had to
be written for the window.

Altitude zero is **where this Drone took off from**. It is reported, not assumed — it is the
datum `altitudeM` is measured against, and it comes from the aircraft. Drawing it claims
nothing about the room.

Nothing is drawn at the top, at the sides, or anywhere else. A ceiling line *would* be a claim
about the room, and there is none.

## Out of scope, deliberately

**Conflict and link lines in the side view.** Both encode a horizontal distance the rangefinder
reports. How that distance should read against a difference in height is a separate question
nobody has answered, and a line drawn between two marks in the side view would look like it had
been. The top-down keeps both; the side view draws marks, names and heights only.

**Persisting the choice.** Top-down on every load. It answers the more common question, and a
Teacher who left it on Side last Thursday should not find it there with a class walking in.

**Any third view.** Superseded by [ADR-0017](./0017-a-front-view-on-the-scope.md) — Front
reuses this ADR's elevation rules against the other floor axis.

## When this ADR is wrong

If Teachers never touch the toggle. A view nobody swaps to is a view that is not answering a
question they have, and the evidence would say the height number on each mark was already
enough.

It is also wrong if the two views turn out to be needed at once — if a Teacher is observed
swapping back and forth to compare, that is the product asking for both on screen, and the
answer would be a wider layout rather than a taller one, so that ADR-0014's fix survives it.
