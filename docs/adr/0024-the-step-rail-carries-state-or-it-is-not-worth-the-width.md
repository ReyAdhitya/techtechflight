# The Mission run rail returns, carrying state and able to be put away

The twelve steps of the operational workflow are back as a left rail on Lesson and Control. This
reverses the decision of 2026-08-04, which withdrew a twelve-step left rail the same day it
shipped. The reversal is narrow, and it rests on what was wrong with the first one rather than
on a change of taste.

## What the first rail actually was

It listed the twelve steps, marked one of them current, and linked each to a screen. That is a
second navigation. The top bar already names the places to go; a column that names them again in
a different order, permanently occupying seventeen rem of a board read across a classroom, was
paying real width for a restatement.

Worse, three of its links did not lead anywhere. **Approve Takeoff** and **Confirm Completion**
were steps 6 and 11 in that list, and neither `ClearanceQueue` nor `ConfirmMissionComplete` was
mounted on any screen. Both components existed. Both had passing tests. Neither was imported by
anything a Teacher could open. A Teacher clicking step 6 arrived at Control and found nothing
about clearance, which is worse than not offering the step.

## What makes this one different

**It carries state the top bar cannot.** Each step reads as one of four marks:

| Mark | Means |
|---|---|
| `done` | behind them |
| `current` | where they are |
| `live` | true right now, and not a thing that finishes |
| `locked` | not open yet, with the reason said in words |

`locked` is the point. Before this, a set-up block a Teacher could not use simply was not
rendered, so the screen was silent about why. The rail now says "Draw the Mission Zone first"
against step 3 and "Land or Recall every craft first" against step 11. The same reasoning as
[ADR-0004](./0004-crewai-design-system-with-deviations.md)'s refusal to signal with colour
alone: a state a Teacher cannot account for is not information.

**`live` is the other half.** Monitoring, commanding and answering Alerts are not steps a
Teacher completes. They are all true at once while the class is up, and a stepper that ticked
them off in order would be describing a workflow nobody has. They read as live from the first
clearance and settle to done when the Mission is sealed. This is why the rail has three phases
rather than a flat list of twelve.

**It can be put away.** The rail minimises to a column of numbers, and on a narrow board it
leaves the flow entirely and slides over rather than squeezing a Scope that is already short of
width. The first rail could not be dismissed, which meant a Teacher who knew the day by heart
paid for it all lesson.

## What this required underneath

Two things were missing rather than broken.

**A Mission that outlives one screen.** The Scenario and the zones lived in React state inside
the Lesson screen, so walking to Control to grant a clearance threw them away. The Mission now
lives in `techtechflight:mission-draft`, its own key beside the other side records, and is
adopted by the Lesson that starts after it was planned. It is deliberately not in the Logbook:
that shape syncs to Vercel ([ADR-0015](./0015-dual-write-logbook.md)) and a Teacher's draft has
no business there.

**Somewhere to keep clearances.** `clearance.ts` was written pure and tested pure, and nothing
ever held the state it returned. `techtechflight:clearances` is that holder.

## The consequence that reads as a rule

A Mission becomes *under way* when a Teacher opens Control with a Mission on the Lesson. It is
tempting to start it on the first granted clearance instead, and that is circular: the queue
fills itself from eligibility ([ADR-0021](./0021-clearances-and-instructions-are-records-not-commands.md)),
eligibility requires an active Mission, so nothing would ever reach the queue. Arriving at the
flying board with a Mission is the honest moment.

None of this touches the command seam. Granting a clearance is still a record addressed to a
person, and confirming completion still seals only what was observed.

## What could have gone differently

**Leave the twelve steps withdrawn and mount steps 6 and 11 on Control without a rail.** That
would have fixed the unreachable steps, which was the real defect, at no width cost. Rejected
because it leaves the other half standing: a Teacher part-way through set-up still could not
tell how far through they were, still could not go back to change an answer, and still met
blocks that appeared and vanished without saying why. The rail is what makes the twelve steps a
workflow rather than a list somebody drew once.

**Put the steps along the top instead.** Rejected: twelve steps with a state line each do not
fit a horizontal strip without becoming numbers alone, and numbers alone is the version that
says nothing.
