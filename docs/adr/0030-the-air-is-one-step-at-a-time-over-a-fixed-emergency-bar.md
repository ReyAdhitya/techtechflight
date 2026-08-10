# The air is one step at a time, over a fixed emergency bar

Steps 6 to 10 each show **only their own panel**, in the rail's order, exactly as steps 1 to
5 do. Above them, on every step and never scrolling away, sit the **Attention bar** and the
**fleet-wide Land all, Hover all and Stop all**.

This reverses one paragraph of
[ADR-0026](./0026-one-page-holds-the-twelve-steps.md). Everything else in that decision
stands: one page holds the twelve steps, the rail is the only navigation on it, every step
carries a done string and a lock reason, and set-up is still five steps shown one at a time.

## What ADR-0026 said, and why it said it

> **In the air, steps 6 to 10.** Not sequential. […] The live board stays whole. The rail
> marks where the Teacher is looking and moves them to it; it does not hide the other three.
>
> This is also what keeps the Control strip anatomy rule intact. Land, Hover, Recall and Stop
> stay in the flow on every strip. Gating them behind step 9 would put a Command behind a
> navigation press, and the last time strips were compacted it broke CI and hid Commands from
> the scan path.

The safety argument is a good one and it is the reason this ADR exists rather than a quiet
edit. **A Command a navigation press can hide is a Command a Teacher cannot reach in ten
seconds.** That has not stopped being true.

## Why the whole board did not work

The rail promised an order the page did not have.

```
THE RAIL SAYS              THE PAGE ACTUALLY WAS
6  Takeoff clearance       Attention        ← step 10
7  Where everything is     Clearance        ← step 6
8  Telemetry and camera    Commands         ← step 9
9  Commands                Scope            ← step 7
10 Alerts                  Fleet actions
                           Target
                           Strips
                           Seal
```

`ControlScreen` was one page of nine sections and the rail scrolled into it by `ref`. Tapping
step 7 scrolled **past** steps 9 and 10 to reach it; tapping step 9 went backwards. The
numbers counted up and the page did not.

That is not a layout complaint. A rail that says *you are at 7* while the screen jumps
somewhere behind 9 has stopped being a map, and the twelve-step rail is the product
(ADR-0026's own words). Either the page follows the rail or the rail is decoration.

## How ADR-0026's argument is answered rather than ignored

**The emergency is fleet-wide, and the fleet-wide controls never move.**

```
┌────────────────────────────────────────────────┐
│  ⚠  Drone 3 is close to a red zone   [Recall]  │ ← every step
├────────────────────────────────────────────────┤
│  Land all      Hover all      Stop all         │ ← every step
├──────────────┬─────────────────────────────────┤
│ 6 Clearance  │                                 │
│ 7 Where    ▸ │      one thing at a time        │
│ 8 Telemetry  │                                 │
│ 9 Commands   │                                 │
│ 10 Alerts    │                                 │
└──────────────┴─────────────────────────────────┘
```

A Teacher can bring **every** aircraft down from anywhere in the run, in one tap, without the
whole board being present. The ten-second case ADR-0026 was protecting is the case where
something has gone wrong in the room and the answer is "everything, now", and that answer is
now closer than it was: it is a fixed bar rather than a section a Teacher had to find by
scrolling.

The Attention bar stays for the same reason. It is the one thing on the board that says
*look at this* rather than waiting to be looked at, and a Teacher on step 6 must not miss an
Alert raised about step 10.

## The cost, written down rather than glossed

**Per-Drone Land, Hover, Recall and Stop now live on their own step.** A Teacher who wants to
land *one* Drone is one rail tap away rather than zero.

That is a real loss and it is a decision, not an oversight:

- The emergency is covered, because an emergency in a room full of children is not usually
  one aircraft. Stop all is on screen at every step.
- The per-Drone case is a *judgement* — this team is drifting, bring theirs in — and a
  judgement has time for a tap.
- The strips themselves are unchanged. Every strip keeps its coordinate line and keeps Land,
  Hover, Recall and Stop in the flow, never gated on selection. What moved is the step the
  strips are on, not what a strip contains. The failure the old rule was written against was
  *compacting* strips, which hid Commands from the scan path and broke CI; nothing here
  compacts anything.

`CLAUDE.md`'s strip anatomy rule is amended in the same commit as this ADR to say exactly
that, because a rule quietly broken is worse than a rule changed on the record.

## Considered options

**Leave it whole and reorder the sections to match the rail.** The cheapest fix, and it was
seriously considered: it removes the "numbers count up, page does not" problem for nothing.
Rejected because it leaves the real complaint standing. Nine sections on one page is nine
things competing while a class is in the air, and the rail's promise is *one thing at a
time*; a Teacher scrolling to find step 8 among steps 6, 7, 9 and 10 is doing the work the
rail exists to do for them.

**Keep the whole board and let the rail filter it.** Same page, sections hidden rather than
unmounted. Rejected as the worst of both: a Teacher cannot tell a hidden section from an
absent one, and the scroll position still belongs to a page that is mostly not there.

**One step at a time with no fixed bar.** Rejected outright. This is the option ADR-0026
refused, and refusing it is what makes the reversal safe rather than reckless.

**Put the per-Drone commands in the fixed bar too.** Rejected. Six Drones' worth of Land,
Hover, Recall and Stop above every step is a wall, and a wall above the thing a Teacher came
to read is how a fixed bar stops being read at all.

## Consequences

`ControlScreen` gains a `step` it renders one panel for, and the sections it used to scroll
into by `ref` become that panel's content. The refs and the scroll-into-view behaviour go
with them: there is nowhere to scroll to when there is one thing on the screen.

`/control` still resolves and still forwards, unchanged.

The steps a Teacher is *not* on go on computing. Points tick off from Telemetry, the
classroom session is written, the heartbeat beats and Alerts are raised whether or not the
panel that displays them is mounted, because none of that lives in a panel.

## When this ADR is wrong

When a Teacher is measured reaching for a single Drone's Land often enough that the extra tap
costs more than the ordering buys. That is a thing to watch in a real lesson, which has still
never happened. If it is wrong, the answer is not to put nine sections back on one page; it
is to give the selected Drone a place in the fixed bar beside the fleet-wide buttons.
