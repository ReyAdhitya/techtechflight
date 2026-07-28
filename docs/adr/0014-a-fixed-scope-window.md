# The scope draws in a fixed window, and the window is not the flight area

The scope draws in a square window of a fixed size, centred on the middle of the Fleet. The
size is the smallest rung of `[8, 12, 16, 24, 32]` metres that holds every placed Drone; the
centre is snapped to a multiple of the grid cell. Both are held while the board is open and
**reconsidered only when a Drone has actually left the window** — the size may then grow and
never shrink. Grid cells are half a metre at the first two rungs (`gridStepM()` widens the
step on larger windows so the mesh does not take over). There is **no live `Grid:` caption**
— issue #18 removed it because it read as a claim about what a cell measured on the glass.
The whole picture is capped at 600 px and centred in its column.

**The window is a property of the display, not a claim about the room.** It says *"this is
how much space is being drawn"*, never *"this is where the Drones may fly"*. Nothing is drawn
at its edge, no Alert derives from it, and no Command is refused because of it.

This ADR exists because without it the change reads as a violation of
[ADR-0012](./0012-the-mission-planner-plans-people-and-exercises-not-the-room.md), and the
next reader deletes it.

## Why the old window had to go

The bounds were the Fleet's own extent plus a metre of padding, recomputed on every Fleet
State. A Teacher reported it as *"the squares move, the dots should move"*, and that was
exactly right — three things moved on every telemetry tick:

- `project()` shifted, so every grid line moved.
- The container's `aspectRatio` was `widthM / heightM`, so the frame reshaped.
- `gridLines()` took `Math.ceil((high - low) / 12)`, so the number of cells changed.

And then `percentOf()` renormalised each Drone into that same moving box. A Drone flying east
while the east edge went east with it landed on nearly the same percentage. The Drones were
the only things on the picture that were genuinely moving, and they were the only things that
looked still.

It is also why the cells were not square. The frame took the room's aspect ratio, which is to
say the shape the Fleet happened to be standing in — a wide shallow strip of Drones drew a
wide shallow box over a grid of whole metres.

## Why this is not the flight area ADR-0012 deferred

`docs/DESIGN.md` §4.3 is unambiguous: **"No room outline, no zones, no boundaries."** The
distinction is worth stating precisely, because a rectangle on a plan view looks like a room
whatever the intention behind it.

ADR-0012 defers the flight area because it is **a claim about physical space** that has to
line up with what the aircraft reports, and `LocalPosition`'s origin has not been shown to be
stable, shared between Drones, or accurate to better than the size of a classroom feature. A
no-fly zone is *absolute*, and is wrong by exactly as much as the origin is.

The window makes no such claim. Three properties keep it honest, and all three are testable:

1. **It is derived from the Drones, not asserted about the room.** It is whichever rung holds
   them. It never says a Drone is inside or outside anything.
2. **Nothing is drawn on it.** The frame is the edge of the picture — the same border the
   `<figure>` would have had anyway. No wall, no hatching, no zone fill.
3. **No Alert, Status or Command derives from it.** `web/lib/vitals.ts` does not know it
   exists. A Drone at the edge is in no different a state from one in the middle.

A Drone beyond the largest rung is **held on the edge and named in the caption**. That rule
is the clearest evidence of the distinction: a boundary would have been the place to raise an
exception, and instead the boundary apologises for its own limits. The reason is honesty, not
politeness — a Drone missing from the scope reads as a Drone that is not flying.

## Why a ladder, why it is held, and why it only grows

A window fitted to the Fleet is a window that moves, which is the original bug. A ladder of
five sizes means the size changes rarely, by a visible amount, and for a reason a Teacher can
see — a Drone left the frame.

**The hold is the load-bearing part, and it covers the centre as well as the size.** The
window is kept exactly as it is for as long as it holds every Drone. Recomputing either freely
puts the drift straight back: the size by flipping between rungs when a Drone hovers on a
boundary, and the centre by following the Fleet, which is the original bug wearing a different
hat — the frame slides under the Drones and they read as standing still.

**The centre is snapped to a whole cell.** When the window does have to move, snapping is what
keeps the rules falling on the same metres they always did, so it moves by whole cells and
never by a fraction of one. It also keeps the frame's own edges on cell boundaries, so no
half-cell appears at the margin.

**The size never shrinks.** Growth is rare, visible and correct; shrinkage is a jitter source
with nothing to show for it.

All of it is held in a ref, so it lasts as long as the scope is on screen and no longer — a
Teacher who navigates away and back gets the smallest window that fits.

## Why it centres on the Fleet rather than on the setup point

The first version of this decision centred the window on the origin, on the reasoning that the
setup point is the one fixed thing in the picture. Photographing it showed the cost: the
simulator's Fleet is set up at the origin and extends east, so it drew entirely in the right
half of the frame with the left half empty. A Fleet set up in the corner of a room drew in the
corner of the picture.

That is not only ugly. It wastes half the resolution, which pushes the marks closer together
than they need to be, which is what made the labels collide on a narrow screen. Centring on
the Fleet took the demonstration Fleet from a 12 m window to an 8 m one for the same six
Drones.

The origin has no special claim here. It is where somebody happened to stand when the Fleet
was switched on; it is not the middle of the lesson.

## Why there is no grid caption

The old caption printed the window's size, which was meaningful when the window was the Fleet's
extent. It is not meaningful now: with a window chosen by the display, `12 m × 12 m` describes
the picture rather than the room, and reads as a claim about the space.

Replacing that with `Grid: 0.5 m` (from `gridStepM()`) was the first fix this ADR proposed —
one cell is the quantity a Teacher can hold two Drones up against. In practice the caption
still read as a claim about what a cell measured **on the glass**, which is exactly the lie
a scale reference must not tell. Issue #18 removed the caption; altitude on each mark carries
the readable quantity instead. `gridStepM()` still chooses the rules the grid draws — half a
metre at the first two rungs, widening later so cells across stay between 16 and 24 — but it
is not printed.

## Considered options

**Take the room bounds from the simulator's `ROOM`.** Rejected, and it is the option this ADR
exists to refuse. `ROOM` is four numbers invented so the simulated rangefinder has walls to
find; promoting it to the display would be modelling the room by the back door and would be
straightforwardly wrong against real hardware.

**Keep the fitted extent and only fix the aspect ratio.** Rejected: it fixes the square cells
and leaves the grid drifting, which is the complaint that was actually made.

**Fit the window to the Fleet but round it up to the next metre.** Rejected. It reduces the
drift without removing it — the box still moves whenever the Fleet crosses a metre, which is
constantly, and the failure becomes intermittent rather than absent. Intermittent is worse:
it is the version nobody can reproduce.

**One fixed size, never growing.** Rejected as dishonest at the top end. A Fleet in a sports
hall would be permanently clamped to the edge with a caption naming all six Drones, which is
not a picture of anything.

**Centre on the Fleet without snapping to a cell.** Rejected. It fixes the framing and
reintroduces the drift, because the Fleet's midpoint moves continuously and the frame would
move with it by fractions of a cell. Snapping is what makes "centred on the Fleet" compatible
with "the grid does not move".

**Shrink the marks or the label type instead of dropping the phase.** Rejected: ADR-0008 makes
every size relative to the Teacher's own font size, and a scope that opts out of that to fit
more in is the exact defect ADR-0008 exists to prevent. Dropping a line that is duplicated ten
centimetres further down the screen costs nothing; shrinking type costs the Teacher who set a
larger one.

## Consequences

**The scope is capped at 600 px and centred**, rather than filling its column. A square scope
at full width is 1216 px tall at a 1440 px viewport — taller than a laptop screen on its own,
and it put every flight strip below the fold. The strips are where a Teacher works; the scope
answers "which one is that". A picture that costs a whole screen has the two the wrong way
round. The cap is in rem so it follows the display scale rather than stranding the scope at a
fixed size under LARGE FORMAT (ADR-0008).

**The phase is dropped from the marks below 640 px**, and the Drone Name never is. Six labels
in a short strip run into one unreadable line — the bug `Scope.tsx` already records having
found once — and the phase is what makes them do it, being three times the width of a name.
Nothing is lost: the same phase is on that Drone's flight strip further down the same screen.
The name survives at every width because a scope of anonymous dots does not answer the one
question the scope is for.

The `-1` metre of padding is gone. A Drone at exactly the origin used to sit in a 2 m box and
now sits in an 8 m one. That is the intended change.

The section heading above the scope stays left-aligned in its column while the picture is
centred, so the two no longer line up. Noted rather than fixed — it is a smaller thing than
either problem the centring solved.

`roomExtent()` keeps its name, its exported status and its `project` / `projectOf` /
`percentOf` members; only the choice of bounds changed. It gains an optional second argument
for the held side and a `beyond` list for the Drones held on the edge.

## When this ADR is wrong

When the flight area arrives for real — when the drone team confirms `LocalPosition`'s origin
is stable and shared, and ADR-0012 is revisited on measurement rather than on assumption. At
that point there is a genuine boundary to draw, and the display window either becomes it or is
clearly distinguished from it. Merging the two silently is the failure to avoid: it would turn
a rendering convenience into a safety claim without anyone deciding to.

It is also wrong if the rungs turn out to fit no real classroom — if every school Fleet spends
its time at 32 m with Drones on the edge, the ladder is wrong rather than the idea, and the
fix is different numbers, not a fitted window.
