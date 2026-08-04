# The Mission Planner plans people and exercises, and does not model the room

> **Superseded in part by [ADR-0019](./0019-the-flight-area-is-drawn-in-the-local-frame.md).**
> The flight area is now drawn — as polygons in the Fleet's own local frame, which makes them
> *relative* claims rather than the *absolute* ones this ADR correctly refused. Everything else
> here stands, including the vocabulary questions, which
> [ADR-0018](./0018-a-mission-is-a-first-class-record.md) answers.

The Mission Planner covers three things: which Student flies, which Drone they fly, and what
sequence of exercises the lesson runs through. It does not model the flight area — zones,
boundaries, no-fly regions — and nothing in its data model should be shaped around eventually
doing so.

This is the first decision about a part of the product that has no code, no prior ADR, and no
entry in `CONTEXT.md`. It exists to stop Phase 3 drawing something before Phase 2 has said
what it is.

## Why these three, and not others

All three are **Teacher-authored records about a lesson**, and all three extend something
that already exists rather than inventing a new kind of thing:

- Student and Drone assignment extends the pairing already kept in `web/lib/logbook.ts` and
  shown on each flight strip in the Tower.
- The exercise sequence extends `LessonRecord`, which already has a label, a start, an end,
  incidents and per-Drone tallies — everything except what the lesson was *for*.

That shared nature is the point. Three records the Teacher writes, kept the same way, shown
in the same places, exported together. It is one feature, not three.

It also answers a real question the product currently cannot. The Tower can say *"Drone 3 is
too close to Drone 1"*; it cannot say *"and Priya is meant to be hovering, not flying a
square"*. The gap between what a Drone is doing and what it was supposed to be doing is the
thing a controller actually watches, and none of it is knowable from Telemetry.

## Why the flight area is different in kind

It is not merely a larger version of the same work. Everything above is something the Teacher
knows and types. A flight area is a claim about physical space, and to be worth anything it
has to line up with what the aircraft reports.

Today the only room model in the system is `ROOM` in
`ground-station/src/simulator/simulated-telemetry-source.ts` — four bounds, invented so the
simulated rangefinder has walls to find. It is a property of the simulation. Promoting it
into the contract would mean asserting a geometry that no real airframe has yet been shown
able to report against, which is the same mistake ADR-0007 declined to make about charging:
building a feature on a hardware capability nobody has confirmed exists.

`LocalPosition` is deliberately metres from where the Fleet was set up rather than a
coordinate on the planet, and nobody has established how accurate that origin is, how it
survives a power cycle, or whether two Drones agree about it.
Separation alerts survive that uncertainty because they are *relative* — two Drones being 0.4m
apart is true whatever the origin. A no-fly zone is *absolute*, and is wrong by exactly as
much as the origin is.

So: deferred, and deferred with a reason that can be checked later rather than a shrug.

## Vocabulary this decision forces open

`CONTEXT.md` is authoritative, and the oversight work has begun using words it does not
contain. Phase 2 has to settle this before Phase 3 designs anything, because the glossary is
the one document that governs what appears on screen.

- **"Callsign"** is used throughout `web/lib/vitals.ts` and the Tower for what `CONTEXT.md`
  calls a Drone's **name**. Air-traffic vocabulary arrived with the metaphor and was never
  reconciled with the glossary. Either the glossary gains it deliberately, or the Tower
  speaks the existing word. Both are defensible; drifting between them is not.
- **"Pilot"** appears as `pilots`, `assignPilot`, `pilotOf` and `PilotField` in the Logbook
  and the Tower. `CONTEXT.md` lists *pilot* among the words to avoid. The user-facing text
  is already clean — "Who is flying", "Flown by", "Add a name" — so this is internal naming
  only, but it is the kind of drift that reaches the screen eventually.
- **"Mission"** and **"Exercise"** have no entries at all. If the planner is going to be
  called a Mission Planner, `CONTEXT.md` needs to say what a Mission is and how it relates to
  a Lesson — a word the glossary already uses everywhere.

None of these is settled here. They are recorded as blocking inputs to Phase 2.

## Considered options

**Assignment only — a rota, no exercises.** Rejected as too little. It records who has what
and never records what they are meant to be doing with it, which leaves the Tower unable to
compare intent against behaviour.

**Exercises only — a lesson structure with no people in it.** Rejected as too little in the
other direction, and it discards the Student assignment that already exists and already works.

**All four, including the flight area.** Rejected for the reasons above. Worth noting that
this is the option most likely to look best in a demonstration, and that is not a reason.

**Defer the whole planner until hardware questions are answered.** Rejected. Nothing in
assignment or exercise sequencing depends on a single hardware answer — they are records of
what a Teacher decided, and would be identical if the aircraft were paper aeroplanes.

## Consequences

The Logbook grows again, and with it the weight of finding **F6** in
[`../CODEBASE_AUDIT.md`](../CODEBASE_AUDIT.md): every Teacher-authored record lives in one
browser's `localStorage`, because the board is read-only and there is nowhere else to put it.
A term of lesson plans is a materially different thing to lose than a handful of notes.
Phase 2 must state this as a requirement — export, or a warning, or a considered acceptance —
rather than let it be discovered after it is built.

The Tower gains a second axis of "needs attention": not only *this Drone is in trouble* but
*this Drone is not doing what the plan says*. That is a genuine addition to `web/lib/vitals.ts`
and belongs there with everything else derived, not in a screen.

Deferring the flight area costs the redesign its most visually ATC-like feature. The radar
scope stays a picture of where things are rather than a picture of where things are allowed
to be. That is an honest limitation and should be stated in `DESIGN.md` rather than disguised.

## When this ADR is wrong

When the drone team confirms that `LocalPosition`'s origin is stable, shared between Drones,
and accurate to something better than the size of a classroom feature. At that point the
flight area becomes buildable on measurement rather than on assumption, and this decision
should be revisited — the deferral is about evidence, not about appetite.

It is also wrong if Teachers turn out not to plan lessons in advance at all, and to decide
who flies what in the moment. That would make the planner a record written *during* a lesson
rather than before one, which is a different screen and a different shape of data.
