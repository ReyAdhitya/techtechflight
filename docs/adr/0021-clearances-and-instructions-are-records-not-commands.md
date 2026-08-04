# Clearances and Instructions are Teacher records, and never touch the command seam

Approving a takeoff, assigning a new target, reprioritising a team's Missions and rerouting a
team are **records the Teacher writes**, in the same category as Assignment and the Exercise
sequence. They are not Commands. They do not travel to the ground station, they are not refused
by a hardware Telemetry Source, and they work identically on a real Fleet and a simulated one.

## The observation this rests on

**The Students fly the Drones.** By hand, with a controller, standing in the room.

That is easy to lose sight of while reading a workflow diagram that puts "Approve Takeoff" and
"Emergency Stop" in the same box, and it is the whole distinction. An Emergency Stop is
something done *to an aircraft*. An approval to take off is something said *to a person*, who
then does the flying. One needs a radio protocol; the other needs a Teacher and a record of
what they decided.

Sorting the customer's six teacher actions by that test:

| Action | Kind | Reaches an aircraft? |
|---|---|---|
| Pause | Command `hold` | simulated Fleet only |
| Emergency stop | Command `emergency-stop` | simulated Fleet only |
| Recall / return home | Command `return-home` ([ADR-0022](./0022-return-home-is-a-terminating-command.md)) | simulated Fleet only |
| **Approve takeoff** | **Clearance** | never — it is addressed to a Student |
| **Assign new target** | **Instruction** | never |
| **Reprioritise Missions** | **Instruction** | never |
| **Reroute** | **Instruction** | never |
| **Add a No-fly Zone** | **airspace edit** ([ADR-0019](./0019-the-flight-area-is-drawn-in-the-local-frame.md)) | never |

## Why this matters more than it looks

[ADR-0011](./0011-commands-reach-the-simulated-fleet-only.md) makes hardware refuse Commands
structurally, and it was right to. The cost has been that every oversight feature drawn on the
command seam is undemonstrable on a real Fleet, and stays that way until the drone team answers
questions nobody has asked them yet.

Four of the customer's six actions do not need that seam at all. Recognising which four means
**most of the Teacher's workflow ships now and works on real hardware on the first day there is
any** — the approvals, the targets, the priorities, the airspace. What remains gated is the
three genuinely aircraft-directed Commands, which is exactly the set that *should* be gated.

Getting this wrong in the other direction would have been expensive and quiet: an
`approve-takeoff` added to `CommandKind` would have put a take-off into the one union
`contract/src/index.ts` explicitly says must not contain one, and would have made the whole
approval flow refuse itself on real hardware for no reason.

## Where a takeoff request comes from

The customer's diagram shows student teams sending requests. There is no Student device — that
was decided against — so **the request is derived rather than sent**.

A Drone that is `Ready`, assigned to a team, and past its pre-flight check enters *Awaiting
clearance* on its own. The Teacher sees a queue that filled itself and grants or holds. No
protocol, no second screen, and it matches the customer's own state machine more closely than a
button would have: their lifecycle diagram already calls this state `Holding` and reaches it
without anyone pressing anything.

A Clearance is per team per Mission, recorded with who granted it and when, and it is cleared
when the Mission ends.

## Considered options

**Add them to `CommandKind` and let hardware refuse them.** Rejected. It would break the rule
that every Command reduces the aircraft's energy, it would make four working features fail on
real hardware for a reason that has nothing to do with them, and it would put a take-off in the
take-off-free union.

**A second command-like path to the ground station for "soft" commands.** Rejected. The ground
station owns aircraft and nothing else; a Clearance is a fact about a child. Sending it there
would mean inventing storage, an authority model and a wire format for something the browser
already holds correctly — and `contract/` would gain a message about people.

**Keep them entirely out of the app — the Teacher just says it out loud.** Rejected, and this
was the closest call, because it is what happens in the room anyway. It fails on the fifth of
the customer's safety priorities: nothing is logged. A debrief cannot say the team was retasked
at minute six, and a Mission cannot be scored on whether the team responded to instructions if
no instruction was ever recorded.

## Consequences

`web/lib/clearance.ts` holds the queue and the grants; Instructions live on the Mission record.
Both go in the Logbook with everything else the Teacher writes, and both export with the Lesson.

Every Instruction is visible to the Teacher on the strip it applies to and on the Mission brief,
because an instruction nobody can re-read is a thing said once in a loud room.

`ScreenLockToggle` currently disables Commands so a pupil at the laptop cannot press Stop.
Clearances and Instructions are disabled by it too — they are the Teacher's authority even
though they are not aircraft-directed.

The command path in `contract/` stays exactly as narrow as ADR-0011 left it, which is the point.

## When this ADR is wrong

If a Student device is ever built, the request stops being derived and starts being sent, and
this decision needs a companion about what a request *is* on the wire. The Clearance itself does
not change.

It is also wrong if Teachers find granting clearance per team too slow in a room of twenty, and
start clearing everything at the start out of habit. A clearance nobody withholds is a
ceremony, and the fix would be to make it a real gate or to remove it — not to leave it as
something everyone clicks past.
