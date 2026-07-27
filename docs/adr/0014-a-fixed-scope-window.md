# The scope draws in a fixed window, and the window is not the flight area

The scope draws in a square window of a fixed size, centred on where the Fleet was set up.
The size is the smallest rung of `[8, 12, 16, 24, 32]` metres that holds every placed Drone;
it may grow while the board is open and it never shrinks. Grid cells are half a metre at the
first two rungs, and the caption states which.

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

## Why a ladder, and why it only grows

A window fitted to the Fleet is a window that moves, which is the original bug. A ladder of
five sizes means the window changes rarely, by a visible amount, and for a reason a Teacher
can see — a Drone left the frame.

The ratchet is the other half. Without it a Drone hovering on a rung boundary flips the window
between two sizes on every Fleet State, which is the sliding grid back in a subtler and harder
to describe form. Growth is rare, visible and correct; shrinkage is a jitter source with
nothing to show for it. It is held in a ref, so it lasts as long as the scope is on screen and
no longer — a Teacher who navigates away and back gets the smallest window that fits.

## Why the caption gives the cell and not the window

The old caption printed the window's size, which was meaningful when the window was the Fleet's
extent. It is not meaningful now: with a window chosen by the display, `12 m × 12 m` describes
the picture rather than the room, and reads as a claim about the space.

One cell is the thing a Teacher can hold two Drones up against, which is the scale reference
`docs/DESIGN.md` §4.3 already asks for. Half a metre at the default window was chosen by the
product owner from a rendered comparison on 2026-07-27; on a laptop it draws at roughly a
centimetre a cell.

The step cannot stay at half a metre at every rung — at 32 m that is 64 rules an axis and the
grid becomes a mesh — so it is a function of the window that keeps cells across between 16 and
24. **The caption must read `gridStepM()` and never a literal**, or it will go on claiming
half-metre cells the first time the window grows, which is a scale reference that lies.

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

## Consequences

The scope is square, so on a wide viewport it is much taller than the box it replaces — about
3.5× at 1440 px for the demonstration Fleet. Everything below it on `/control` moves down by
that much. This is a real cost of the change and is not addressed here.

The Fleet no longer fills the frame. The window is centred on the setup point, so a Fleet set
up in a corner of the room draws in a corner of the picture, and the marks sit closer together
than they used to at the same viewport width. On a phone this is enough to make the Drone
labels overlap — a bug `Scope.tsx` already records having found once. Both are noted on the
issue for a decision rather than fixed here.

The `-1` metre of padding is gone. A Drone at exactly the origin used to sit in a 2 m box and
now sits in an 8 m one. That is the intended change.

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
