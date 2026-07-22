# Board audit — the Fleet status board

A critique of `web/` against the four layers named in `MISSION.md`: information design,
visual craft, real conditions, and states and motion.

Written by reading the code and measuring the running board, not by applying a checklist.
Where a finding is measured, the measurement is given. Where it is a judgement, it is
marked as one, so it can be argued with.

Two findings from this audit are already fixed and are recorded here as history rather
than as work: the summary counting Stale Telemetry with full confidence, and the empty
Fleet. Everything else is open.

## What is already right, and should not be traded away

Naming this first is not politeness. Several of the findings below have obvious fixes
that would cost one of these, and the trade is not worth it.

- **The heading is the answer, not a title.** `FleetSummary.tsx:24` makes the count the
  board's only `h1`. Most dashboards put a word like "Overview" there and spend the
  most valuable line on the screen saying nothing.
- **Colour is the third signal, never the first.** Every Status carries a word and a
  shape as well (`status-presentation.ts`). This survives a projector, a photocopy, and
  a colour-blind Teacher.
- **Tiles never reorder.** `FleetBoard.tsx` keeps ground-station order, so position is
  learnable and a dipping battery does not shuffle the board under someone's hand.
- **Absence is distinguished from zero.** A Drone never heard from says so, rather than
  showing an empty battery (`DroneTile.tsx:108`). A forecast with no honest basis is
  absent rather than blank (`DroneTile.tsx:79`).
- **The connection banner speaks about the board, not the Drones**, and deliberately
  avoids the entire Status vocabulary so nothing in it can be misread as being about an
  aircraft (`ConnectionBanner.tsx:4-15`).

## Layer 1 — Information design

### 1.1 The summary's numbers do not account for the whole Fleet (open)

The header shows three numbers: usable, needing attention, and flying. Offline Drones
appear in none of them. On a Fleet of ten with three switched off, a Teacher reads
"4 of 10 ready · 3 need attention · 0 flying" and there are three Drones unaccounted for.

Nothing is wrong with any individual number. The problem is that they invite addition and
then do not add up, and the missing quantity is the one the glossary says is the normal
resting state. A Teacher doing the arithmetic concludes either that they have miscounted
or that three Drones are missing from the room.

This is a judgement, not a measurement. The fix is not obvious and may be "nothing":
naming Offline in the header spends the board's most valuable line on the least urgent
category, which is exactly what the design has been avoiding. But the tension is real and
should be a decision rather than an accident.

### 1.2 Flying is counted as neither usable nor needing attention (open, low)

`isUsable` returns true only for `Ready`, and the contract comment at
`contract/src/index.ts:176-178` argues this correctly: a Flying Drone is in use, not
available. But a Teacher setting up the next lesson wants to know when it comes back, and
the board says nothing. `timeToReadyMs` exists for charging; there is no equivalent for
"expected to land". Whether the hardware can even say is an open question for the drone
team.

### 1.3 The summary scrolls away (open)

`.site-header` is sticky (`globals.css:423`). `FleetSummary` is not. On a Fleet large
enough to scroll — a set of thirty at `minmax(15rem, 1fr)` will, especially at large
format — the answer to the only question the board exists to answer leaves the screen,
and what stays pinned is the logo and the theme toggle.

That is the wrong element pinned. This is the most consequential open finding in this
layer.

### 1.4 The one place colour is the only signal is the summary (open, measured)

`NOTES.md` states the rule as already held: "Colour is never the sole carrier of meaning;
shape and word carry it too." That is true of every tile. It is not true of
`FleetSummary.tsx`.

`attentionSeverity` returns `fault`, `fixable`, or `undefined`, and the only thing that
changes is a class: `text-status-fault`, `text-status-not-ready`, or `text-ink-muted`.
The words are identical either way — "3 need attention" reads the same whether those are
three flat batteries or three Drones leaving the set. Shape and word carry nothing here;
colour carries all of it.

The glanceability research measured what that costs: under both red-green dichromacies
the amber and coral collapse into the same olive, ΔE00 falling from 22.8 to 5.1
(deuteranopia) and 5.5 (protanopia). Each still reads against the canvas, so nothing
becomes illegible — what disappears is the severity split, for something like one male
Teacher in twelve.

The distinction is the one ADR-0004 argues hardest for: amber is a Teacher with charging
to do, coral is a Drone out of service. The board is careful about it everywhere except
the single line most likely to be read from across the room.

Fixing this is a design decision rather than a bug fix — it needs a word or a mark, and
choosing which without reopening the Needs Attention bucket that `CONTEXT.md` deliberately
closed is the hard part. Flagged rather than fixed.

## Layer 2 — Visual craft

### 2.1 The Status shape does not scale with large format (open, measured)

This is the significant one.

`StatusBadge.tsx:39` sizes the shape `size-[11px]`. Measured on the running board with
`--display-scale` moved from `1` to `2`:

| | 1× | 2× |
|---|---|---|
| Root font | 16px | 32px |
| Summary count | 44px | 88px |
| Tile name | 24px | 48px |
| **Status shape** | **11px** | **11px** |

Every element on the board grows except the one that carries Status without relying on
colour. Relative to the tile name beside it, the shape falls from 46% to 23%.

The intent behind large format (ADR-0008) is a board read from further away. The intent
behind the shape (`status-presentation.ts:5-9`) is a Status signal that survives a
washed-out projector. Those two intentions meet in exactly the condition where this bug
fires: the projector, at distance, is where the shape matters most and where it is now
half the relative size it had at desk distance.

`globals.css:88-93` states the rule this breaks: the scale is in `rem` "so that one
control moves all of it". The shape is the exception nobody noticed, and it is the worst
possible element to have been the exception. The `outline-[1.5px]` and
`outline-offset-[2.5px]` on the `ringed` shape have the same problem, which additionally
means the Flying ring gets proportionally tighter to its dot as the board grows.

Fix: `size-[0.6875rem]` and the equivalent for the outline, or better, a token so the
shape is expressed in the same scale as the text it sits beside.

### 2.2 The summary count's letter-spacing does not scale (open, measured)

`FleetSummary.tsx:25` sets `tracking-[-0.88px]`. Measured: the count's font-size goes
44px → 88px under 2× while its tracking stays at −0.88px. That is −2% of the glyph size
at 1× and −1% at 2×, so the board's largest number visibly loosens exactly as it gets
bigger — the opposite of what optical sizing wants, since large type needs *more*
negative tracking, not less.

`-0.02em` expresses the same value at 1× and holds it at every scale.

### 2.3 `tracking-[-0.4px]` on the tile name is dead (open, measured, trivial)

`DroneTile.tsx:50` sets `tracking-[-0.4px]`, but the measured value is −0.48px at 1× and
−0.96px at 2× — that is `-0.02em` from `.font-display` (`globals.css:363-367`) winning on
source order. The declaration has never had any effect. Deleting it changes nothing
visually and removes a line that misleads the next reader about what controls this.

Worth noting the shape of the bug: this one is harmless and 2.2 is not, but they are the
same mistake. A px value written beside a rem system is invisible until the scale moves.

### 2.4 The data is the second-smallest type on the board (judgement)

`globals.css:100-101` sets `--text-value: 0.875rem` with the comment "Data. Larger than
the label naming it — the value is what a Teacher came to read."

The comment is true as written and misleading as intent. The value tier *is* larger than
the label tier (0.75rem), but it is smaller than body (1rem), and it is what carries the
battery percentage (`BatteryLevel.tsx:54`), the age line every reading is qualified by
(`DroneTile.tsx:97`), and the charge forecast (`DroneTile.tsx:80`). On a board whose
stated job is glanceable telemetry, the telemetry is set below body size.

The counter-argument is real and is probably why it is this way: the Status word and the
Drone name are what a Teacher reads first, and inflating every number would flatten that
hierarchy. But "larger than the label" is a low bar to have set for the tier doing the
most work, and the comment should say which it means.

## Layer 3 — Real conditions

### 3.1 Glanceability is asserted, never measured (open — being researched separately)

`DroneTile.tsx:29` claims "a size that reads from a few steps away". `README.md` claims a
board for "a projector or a room read from a distance". `NOTES.md` already flags that
nothing has tested either.

The specific worry, now that 2.1 is known: a Fault tile differs from a Ready tile by a
1px border and an 11px shape. Both of those are the board's least scalable elements, and
a 1px border is a poor channel in peripheral vision regardless of size. See
`reference/glanceability.md` for the standards work on what the numbers should actually be.

### 3.2 Fixed — the summary spoke with total confidence about Stale Telemetry

`stale` is orthogonal to `status` in the contract: Telemetry ages into Stale well before
it ages into Offline, so a Drone can be counted `Ready` on a reading nobody has heard in
minutes. Every tile hedged about its own Telemetry in italics; the count above them —
the one number read from across the room — did not.

Now qualified: "2 of those not heard from recently", in the same stale treatment the
tiles use.

### 3.3 Fixed — an empty Fleet looked like a broken board

`FleetBoard.tsx` mapped `state.drones` with no zero check, so a School before its Drones
are registered got "0 of 0 ready" over a blank grid. The board's own rule is that an
absence a Teacher can understand must never be shown as an empty version of a normal
reading; the Fleet-level case was the one place that rule was not applied.

### 3.4 Fixed — large format had never worked in this board at all

Found by the glanceability research and confirmed live before fixing.

`display-scale.ts:31` stamped `data-display="large"` on the root. The boot script in
`layout.tsx:39` stamped it before first paint. `globals.css` declared `--display-scale`
and `html` consumed it. Every part was in place except the one rule joining the attribute
to the value, which stayed behind in `dashboard/src/styles/tokens.css:198` when the board
was ported to Next.

So the toggle moved, relabelled itself, persisted the choice across reloads — and resized
nothing. Measured before the fix: `data-display="large"` set, root font 16px, unchanged.

This is the most consequential thing found so far, because every claim the project makes
about being read from across a room or off a projector rests on a feature that has never
once run. The audit's own §3.1 was measuring a board that could not grow.

Now restored at the Vite board's 1.375, and verified end to end: root 16→22px, tile name
24→33px, summary count 44→60.5px, Status shape 11→15.1px. The shape only participates
because of 2.1 above — had that stayed in px, restoring this rule would have grown every
element on the board except the Status signal, which is a worse failure than the one it
replaced.

A caveat that should not be lost: `reference/glanceability.md` measures 1.375 as buying
roughly one metre of viewing distance against a 3 m claim. The feature now works. Whether
its value is right is a separate, unmade decision.

### 3.5 No upper bound has been considered (open)

Every fixture and every test uses between one and six Drones. A classroom set is
plausibly thirty. At thirty the grid scrolls, 1.3 becomes acute, and the sixty tab stops
to reach the last Details button become a real cost for a keyboard user. Nothing is known
to be broken — it has simply never been looked at.

## Layer 4 — States and motion

### 4.1 A Status change is half-animated (open)

`.settle` (`globals.css:407-411`) transitions `color`, `background-color`, `border-color`
and `width` over 400ms. A tile going Ready → Fault changes three things at once: the
border colour (eased, 400ms), the text colour (eased, 400ms), and the badge *shape*,
which is a class swap and therefore instant.

So the shape snaps while the colour drifts for another 400ms. The two signals that are
supposed to be saying the same thing arrive at different times, and the change reads as a
glitch rather than as one event. This is the layer `NOTES.md` already identifies as
barely explored, and this is the concrete instance of it.

Whether to fix by animating the shape or by removing the easing from status colour is a
real design question. Making them simultaneous matters more than which way.

### 4.2 A Drone joining or leaving the Fleet is unhandled (open, low)

Tiles are keyed by `drone.id`, so React will insert or remove one with no transition and
reflow the grid under whatever the Teacher was looking at. Rare — the roster changes when
a School buys a Drone — but it is the one board change that moves every tile, which is
precisely the thing `FleetBoard.tsx:16-23` argues must never happen.

### 4.3 The stale qualifier appears rather than changing (deliberate, flagged)

The new line in `FleetSummary` is absent at zero, which is the opposite rule from the
Needs Attention count directly beside it — that one is present at zero specifically so it
changes rather than materialises.

The reasoning for the difference is in the code comment: Telemetry going Stale is
genuinely news arriving, whereas the attention count is a number under watch. That is a
defensible distinction but it is a distinction, and two adjacent elements now follow
opposite rules. If a future reader finds that confusing, this is the place to argue it out.

## Summary

Ranked by what would most improve the board:

| # | Finding | Layer | Status |
|---|---|---|---|
| 1.4 | Summary severity is carried by colour alone; fails both red-green dichromacies | Information design | Open, measured |
| 1.3 | The summary scrolls away; the logo stays pinned | Information design | Open |
| 4.1 | Status change is half-eased, half-instant | States and motion | Open |
| 3.1 | 1px border cannot carry hue at any viewing distance | Real conditions | Measured, open |
| 1.1 | Header numbers do not account for Offline | Information design | Open, judgement |
| 2.4 | Data tier set below body size | Visual craft | Judgement |
| 3.5 | No upper bound on Fleet size considered | Real conditions | Open |
| 4.2 | Roster change is unanimated | States and motion | Open, low |
| 1.2 | No forecast for a Flying Drone returning | Information design | Open, low |
| 3.4 | Large format had never worked in this board | Real conditions | **Fixed** |
| 2.1 | Status shape ignored large format | Visual craft | **Fixed** |
| 2.2 | Summary count tracking ignored large format | Visual craft | **Fixed** |
| 2.3 | Dead `tracking-[-0.4px]` | Visual craft | **Fixed** |
| 3.2 | Summary trusted Stale Telemetry | Real conditions | **Fixed** |
| 3.3 | Empty Fleet looked broken | Real conditions | **Fixed** |

The pattern worth noticing: six of the fifteen are a px value sitting inside a rem system,
or a mechanism reasoned about carefully at one scale and never re-checked at another —
including one, 3.4, where the mechanism was never checked at all.

The board's positions are sound and are better argued than most production code. What was
missing is a second pass at each position under the conditions the board itself claims to
support. Three of the fixed findings were invisible until something was actually measured
at 2×, and the largest was invisible until someone pressed the button.
