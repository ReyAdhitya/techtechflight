# A Mission is a first-class record, and Mission Scenario replaces Exercise

A **Mission** is one run of a **Mission Scenario** inside a Lesson. It carries an objective,
an airspace, a set of checkpoints, a time limit, success criteria and a score. A Lesson
contains Missions the way it used to contain Exercises, and `Exercise` becomes the thing a
Mission is made of rather than the thing a Teacher picks.

This overturns a rule `CONTEXT.md` has held since the beginning. **Lesson** lists *mission*
among the words to avoid, and `docs/DESIGN.md` §"Words that never appear" bans it outright.
Both are amended here rather than quietly ignored.

## Why the glossary moves

The ban was correct when it was written and is wrong now, and the difference is not fashion.

`CONTEXT.md` refuses aviation's vocabulary where aviation was *renaming something education
already owned*. A Lesson is a Lesson; calling it a sortie buys nothing and costs a Teacher
their own word. That reasoning is intact and this decision does not touch it — **Lesson,
Exercise, Teacher and Student all survive unchanged**.

What has changed is that the product now contains a thing education has no word for. A run
with an objective, a bounded airspace, ordered checkpoints, a clock and a pass mark is not a
Lesson and it is not an Exercise. It is the unit the curriculum is actually sold around, and
the customer's own material — every one of the eight diagrams this decision comes from — calls
it a Mission. Refusing the word would not keep the glossary education-first; it would leave the
central object of the product unnamed, which is how synonyms breed.

This is the same move [ADR-0015](./0015-a-professional-register.md) made about register, and
for the same stated reason: a considered change, recorded, rather than a drift.

## What a Mission is, precisely

- **Mission Scenario** — the template. `search-rescue`, `delivery`, `building-inspection`, and
  Teacher-authored ones. Carries objective, mission flow, success criteria, common risks, what
  the Teacher monitors, what the team focuses on, and a default time limit. Data, not code.
- **Mission** — one run of a Scenario in one Lesson. Adds the airspace actually drawn, the
  checkpoints actually placed, the teams actually assigned, and the outcome.
- **Exercise** survives as a step *within* a Mission's flow, which is what it always described.

**A Lesson holds exactly one active Mission Scenario.** Photo 2 states it — *"each class
normally focuses on one scenario at a time"* — and it is worth encoding rather than honouring
by habit, because the alternative is a Teacher half-way through Delivery being shown Search and
Rescue's success criteria.

## Why it extends the Logbook rather than becoming a new store

Everything in a Mission is **a record the Teacher wrote**: which Scenario, where the boundary
is, which team flies, what counts as done. That is exactly the category
[ADR-0012](./0012-the-mission-planner-plans-people-and-exercises-not-the-room.md) put in the
Logbook, and `LessonRecord` already holds a label, a start, an end, incidents, per-Drone
tallies, assignments and commands. `exercises` becomes `missions` with a forward migration on
write, the same shape as the `pilots → students` migration already in `web/lib/logbook.ts`.

Telemetry is not involved and must not become involved. No Drone reports which Scenario it is
flying, and none ever will.

## Considered options

**Keep "Exercise" and let Mission Scenario be a subtitle.** Rejected. The Teacher picks the
Scenario first and everything downstream — zones, checkpoints, scoring, the brief — hangs off
that choice. Making the load-bearing noun the subtitle of a weaker one is how a screen ends up
saying two things.

**Add Mission without touching Exercise, so both exist.** Rejected, and this was the tempting
one because it breaks nothing. Two Teacher-facing nouns for "the thing you pick" is precisely
the drift `CONTEXT.md` exists to prevent, and it would be discovered by a Teacher rather than
by us.

**A separate `missions` localStorage key, like the Batch 1A side keys.** Rejected. Those keys
exist because parallel-wave tickets could not extend `Logbook` without colliding — a process
constraint, not a design one, and `CLAUDE.md` already warns against folding them back in
casually. A Mission is not a side fact about a Lesson; it *is* the Lesson's content, and it has
to export, print and archive with it.

**Model a Mission in `contract/`.** Rejected. `contract/` is what the ground station and the
board both need in order to agree about aircraft. A Mission is a fact about a classroom that no
Drone can report, and putting it on the wire would invite a future adapter to try.

## Consequences

`CONTEXT.md` gains **Mission**, **Mission Scenario**, **Checkpoint**, **Clearance** and
**Instruction**, and Lesson's `_Avoid_` list loses *mission*. `docs/DESIGN.md`'s banned-words
list loses it too. *Sortie*, *pilot*, *callsign* and *UAV* stay banned — nothing about this
decision opens the door generally.

The Logbook grows again, and with it the weight of the finding ADR-0012 already recorded:
every Teacher-authored record lives in one browser's `localStorage`. A term of Missions is a
materially larger thing to lose than a term of Exercises was, and the mitigation is now overdue
rather than merely noted.

`LessonTemplatesPack` (`hover-hold`, `pad-land`, `formation`) is currently mounted with a no-op
`onPick`. Those three become the seed of the Teacher-authored Scenario list rather than a
parallel concept.

## When this ADR is wrong

If Teachers turn out to run a Lesson without ever choosing a Scenario — flying freely and
labelling it afterwards — then Mission is a record written *after* the fact and the picker is
in the wrong place. That would be visible immediately in whether the Scenario step is ever
skipped.

It is also wrong if "Mission" turns out to be the customer's word rather than the Teacher's —
if the deck says Mission and the classroom says lesson. The test is what a Teacher says out
loud to a room, which is the same test `CONTEXT.md` applies to Drone Name.
