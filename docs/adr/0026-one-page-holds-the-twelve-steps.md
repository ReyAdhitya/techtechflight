# One page holds the twelve steps, and the rail is the navigation on it

The twelve-step Mission run rail comes back, and this time it is the product rather than a
column beside it. One page carries all twelve steps. The seven-item top navigation collapses
behind one button. `/lesson`, `/control` and `/reports` stop being separate destinations for
the Mission run.

This reverses the supersession that [ADR-0024](./0024-the-step-rail-carries-state-or-it-is-not-worth-the-width.md)
carried from 2026-08-06, which withdrew the rail for a one-page Lesson and an always-on
Control. The product owner made that call on 2026-08-07 against a working prototype, and the
prototype is the specification. ADR-0024 is reinstated and this record extends it.

## Why the reversal is not a change of taste

The 2026-08-04 rail was withdrawn for being a second navigation, and the reasoning was
sound: a column that names twelve places while a top bar names seven others is two
navigations on one screen, and a Teacher glancing at it has to work out which one they are
being asked to read. ADR-0024 answered half of that by giving the rail state the top bar
could not carry. It left the other half standing, because the top bar was still there.

The withdrawal on 2026-08-06 removed the wrong one. It took away the navigation that knew
where the Teacher was and kept the one that did not.

**This ADR removes the other navigation instead.** The rail is the only navigation on the
Mission run page. Fleet, Walls, Students and Vision are still reachable, from one button,
because they are places a Teacher goes between periods rather than during one. Settings keeps
its own control for the same reason it always had one: it is the room and the records, not a
place in the workflow.

## What the rail carries

Each step reads as one of four marks, unchanged from ADR-0024:

| Mark | Means |
|---|---|
| `done` | behind them, with a summary of what was decided |
| `current` | where they are |
| `live` | true right now, and not a thing that finishes |
| `locked` | not open yet, with the reason said in words |

Two things are added.

**A done string.** A finished step says what it decided, not that it is finished. Step 1
reads *Search and Rescue*, step 3 reads *4 teams, 3 craft*, step 12 reads *Sealed 09:44*.
A tick alone tells a Teacher that they did something and not what they chose, which is the
question they are actually asking when they look back up the rail.

**The lock reason is the prototype's wording.** Step 2 reads *Choose a Scenario first*, step
7 reads *Grant a takeoff first*. Said as the thing to go and do, never as the rule that was
broken.

`live` still covers steps 7 to 10. Monitoring, reading one craft, sending a Command and
answering an Alert are all true at once while a class is up, and they settle to `done` when
the Mission is sealed.

## The three phases, and what each is for

**Set up, steps 1 to 5.** Sequential and genuinely so: the Scenario decides the success
criteria, the zones need the Scenario, the teams need craft to take, pre-flight needs a
craft on a team, and the brief reads from all of it. One step is shown at a time.

**In the air, steps 6 to 10.** Not sequential. The prototype says so itself, on step 7:
*Steps 7 to 10 are one screen in the app. The rail keeps your place; it does not make you
click through them in order.* The live board stays whole. The rail marks where the Teacher
is looking and moves them to it; it does not hide the other three.

This is also what keeps [the Control strip anatomy rule](../../CLAUDE.md) intact. Land,
Hover, Recall and Stop stay in the flow on every strip. Gating them behind step 9 would put
a Command behind a navigation press, and the last time strips were compacted it broke CI and
hid Commands from the scan path.

> **Reversed by [ADR-0030](./0030-the-air-is-one-step-at-a-time-over-a-fixed-emergency-bar.md),
> 2026-08-10.** Steps 6 to 10 now show one panel at a time, in the rail's order. The safety
> argument in this paragraph is answered rather than dropped: the Attention bar and the
> fleet-wide Land all, Hover all and Stop all are on screen at every step, so a Teacher can
> stop every aircraft from anywhere in one tap. The cost is real and is written into ADR-0030
> — per-Drone commands are one rail tap away rather than zero. The rest of this ADR stands.

**Close down, steps 11 and 12.** Sequential again, and step 11 refuses while anything is
still airborne. That refusal is the step.

## What this does not change

Nothing here touches the command seam. Approving takeoff is still a record addressed to a
person ([ADR-0021](./0021-clearances-and-instructions-are-records-not-commands.md)). Holding
a takeoff is a record too, and is new only in that the Teacher could not do it before. Zones
are still drawn in the Fleet's own frame
([ADR-0019](./0019-the-flight-area-is-drawn-in-the-local-frame.md)), the Student's tablet is
still a second audience with exactly two pressable things on it
([ADR-0025](./0025-the-student-screen-is-a-second-audience-not-a-second-board.md)), and a
reading the Fleet is not sending is still printed as absent.

Old routes still resolve. `/lesson`, `/control` and `/reports` are no longer where the
Mission run lives, and none of them 404: each sends a Teacher to the step that answers the
question they opened it for. `/reports` also keeps the standing report screen behind it,
because what happened across a term is not part of one Mission run.

## What could have gone differently

**Keep the seven-item navigation and add the rail beside it.** This is what 2026-08-04
shipped and what 2026-08-06 withdrew, and it is the version the owner has now ruled against
twice. Two navigations on one screen is the confusion being removed.

**Gate steps 7 to 10 the way steps 1 to 5 are gated.** Rejected, and the prototype rejected
it first. A Teacher watching four craft does not want the Scope to disappear because they
looked at an Alert.

**Leave the twelve steps as a checklist and keep three screens.** Rejected by the owner. The
argument for it is recorded in the 2026-08-06 entry of `docs/DECISIONS.md` and does not need
restating; what it could not answer is a Teacher part-way through set-up who cannot tell how
far through they are or why the next block will not open.
