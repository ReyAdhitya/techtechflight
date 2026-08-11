# Alerts live on step 10 alone

The **Attention bar** is on step 10 and on no other step. The fleet-wide **Land all, Hover
all and Stop all** stay where ADR-0030 put them: on every step, never scrolling away, never
gated on selection.

This reverses one half of
[ADR-0030](./0030-the-air-is-one-step-at-a-time-over-a-fixed-emergency-bar.md). The other
half stands, and the two were never the same claim: a fixed bar of five Commands is not a
panel of Alert cards, and only one of them was small enough to sit above five steps.

## What ADR-0030 said

> Above them, on every step and never scrolling away, sit the **Attention bar** and the
> **fleet-wide Land all, Hover all and Stop all**.

The reasoning was that a Teacher on step 6 must not miss an Alert raised about step 10, and
that is a sound worry. It is not the worry that won.

## Why it was reversed

Step 6 asks one question — *who may take off* — and answered two. Above the clearance queue
sat the whole Alerts panel: the cards, the Respond and I have this buttons, and the
"2 more in the queue" disclosure. The same panel sat above the Scope on step 7, above the
strips on step 8, above the Commands on step 9, and then again as the thing step 10 is for.

Five surfaces holding one list means four of them are noise and one is the answer, and the
rail loses its meaning: a step that shows its own panel *and* somebody else's panel is not
one step at a time, it is the whole board with a rail drawn on it, which is the arrangement
ADR-0030 exists to have replaced. The board had drifted back to what it had just left.

## The cost, plainly

**A Teacher on step 8 will not learn that a Drone entered a No-fly Zone until they visit
step 10.** The Alert is raised, the record is written, the strip on step 8 says so on that
Drone's own row — and the Attention card that names it, ranks it and offers Respond is on a
step the Teacher is not looking at.

That is a real reduction in how fast a Teacher hears about a breach, and it was put to the
owner in those words and overruled. It is written here rather than left in a commit message
so that the next person to find it finds a decision instead of a mystery.

Three things blunt it and none of them removes it:

- **The emergency answer did not move.** Land all, Hover all and Stop all are one tap from
  every step, which is the response to the worst case. A Teacher who sees a Drone somewhere
  it should not be does not need the card to act.
- **The strips still say it.** Step 8 is the strips, and a Drone in a No-fly Zone reads as
  such on its own row there.
- **Nothing about the Alert is lost.** It waits on step 10, in order, with its Respond.

## Alternatives considered

- **A count rather than the panel.** One line — "2 need attention" — on every step, linking
  to step 10. Rejected for now: it is the fewest words that could carry the warning, and it
  is also a new thing to design, place and test on five surfaces. The board already carries
  `FleetAllWellLine` and `LiveHeadcount` on every step, which say *everything is fine, 0 need
  attention* when it is true and name the count when it is not. That line stays, so the count
  a Teacher needs is on every step already; what has gone is the panel.
- **Attention on steps 7 to 10 but not 6.** Rejected: "which steps deserve a duplicate" is
  the argument this ADR is ending, not a place to settle in the middle of.

## When this ADR is wrong

If a class is run and a breach goes unanswered for minutes because nobody was on step 10,
this is wrong and the count line was not enough. The fix then is not to put the panel back on
five steps: it is to make the always-on line loud enough to move a Teacher, which is one
surface changing rather than five.
