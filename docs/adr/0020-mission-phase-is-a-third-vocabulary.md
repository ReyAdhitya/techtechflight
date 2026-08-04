# Mission Phase is a third state vocabulary, and stays separate from the other two

The board gains **`MissionPhase`** — where a Drone has got to in its Mission. Eleven ordinary
states and nine exception states, derived on the board from Telemetry, Mission progress and the
Teacher's own Clearances. No Drone reports it and none ever will.

It sits **beside** `Status` and `FlightPhase` and replaces neither.

## Why a third one, when two already exist

Three questions get asked about a Drone, and each has its own answer:

| Vocabulary | Question | Derived by | Values |
|---|---|---|---|
| `Status` | Can I hand this out? | ground station, `fleet-core/src/status.ts` | Offline · Ready · Not Ready · Flying · Fault |
| `FlightPhase` | What is the aircraft doing? | board, `web/lib/vitals.ts` | on-ground · climbing · level · descending · auto-landing · emergency · flying · no-contact |
| `MissionPhase` | How is the Mission going? | board, `web/lib/mission-phase.ts` | Standby → … → Finished, plus exceptions |

Collapsing any pair loses something a Teacher needs. A `Ready` Drone may be *Awaiting
clearance* or *Standby*, and the difference is whether the Teacher owes it an answer. A Drone
that is `level` may be *In mission* or *Paused*, and the difference is whether it is doing what
it was told. A `Flying` Drone may be *Returning* or *Recovering*, and one of those is bad news.

This is the same reasoning that already keeps `ConnectionStatus` separate from `Status` —
`web/lib/fleet-link.ts` says so directly — and that keeps `stale` a boolean rather than a
sixth `Status`.

## Where the states come from

The eleven ordinary states are the customer's, unchanged: Standby, Pre-flight check, Awaiting
clearance, Takeoff, Climb/stabilise, In mission, Checkpoint progress, Task complete, Return
home, Landing, Mission finished.

Most cost nothing to derive because the work is already done. Takeoff and Climb fall out of
`FlightPhase`'s `climbing` and `level` and `AltitudeTracker`'s vertical rate. Landing falls out
of `descending` and `autoLanding`. Return home is a Command whose progress `command-tracker.ts`
already follows.

Three are genuinely new, and all three come from records rather than from measurement:
**Awaiting clearance** (assigned, pre-flight ticked, not yet cleared), **Checkpoint progress**
(positions against the Mission's checkpoints), and **Mission finished** (the Teacher confirmed
it).

## Two rules it inherits

**A phase is derived and never optimistic.** Pressing Recall does not move a Drone to
*Returning*; Telemetry showing it moving home does. This is [ADR-0011](./0011-commands-reach-the-simulated-fleet-only.md)'s
rule about Commands applied to the state they produce, and the failure it prevents is a screen
that shows a Drone obeying an order it ignored.

**A phase that cannot be known is said in words, never guessed.** A Drone with no contact is
`no-contact` in `FlightPhase` and stays whatever it last was in `MissionPhase`, with its age.
It does not silently become *Lost link* on a timer and it does not become *Finished* because
the Lesson ended.

## Considered options

**Extend `Status` to cover the mission.** Rejected. `Status` is derived by the ground station
and travels on the wire in `FleetState`; the Mission is a browser-side record the ground station
has never heard of. Making `Status` depend on it would put a classroom fact into `contract/`
and give a future hardware adapter something it cannot possibly report.

**Extend `FlightPhase` instead of adding a type.** Rejected. `FlightPhase` answers a question
about the airframe from Telemetry alone, and it is used by surfaces that have no Mission at all
— the Fleet board, the Walls, the Drone detail screen. Mixing in states that require a Mission
would make it undefined on half its consumers.

**One flat union of all twenty states.** Rejected. The nine exception states are not peers of
the eleven — *Paused* and *Avoiding* and *Low battery* are things that happen **while** a Drone
is In mission, and flattening them loses where it will resume. They are modelled as an
exception riding on an ordinary phase.

## Consequences

`MissionPhase` is what the flight strip shows once a Mission is running, and what photo 7's
status legend means. `Status` keeps the Fleet board and every pre-lesson question.

Three vocabularies is genuinely more to learn, and the mitigation is that a Teacher only ever
sees one at a time: `Status` before the Lesson, `MissionPhase` during it. `FlightPhase` is
internal and reaches the screen only as the phase word on a Scope mark.

Every value carries a word, not only a colour or a position (ADR-0004), and the strips still
never reorder when a phase changes (DELIBERATE-POSITIONS 1).

## When this ADR is wrong

If `MissionPhase` and `FlightPhase` turn out to agree everywhere it matters — if no screen ever
needs both — then one of them is redundant and the honest fix is to delete the weaker rather
than keep two in sympathy.

It is also wrong if the exception states are never seen, because a classroom Mission is over in
four minutes and nothing has time to go wrong in an interesting way. That would make the nine
an over-model, and the evidence would be an empty Alert log across a term.
