# TechTech Flight

A ground-station dashboard that shows a school teacher the current state of every drone
in their classroom set, so they can tell at a glance which ones are usable before a
lesson starts. Built by TechTech Technology, who sell STEM curriculum and drones to
schools.

## Language

### People and places

**Teacher**:
The person who uses the dashboard. A classroom educator, not a trained drone operator.
_Avoid_: user, operator, pilot, admin

**Student**:
A pupil who flies a drone during a lesson. Flies by hand with a controller. May also hold
the **Student Mission** surface on a phone (`/student`) — briefing, takeoff request, and
score — joined to the Teacher board by a classroom code. Still never sends Commands; the
Teacher grants takeoff as a record (ADR-0021, ADR-0025).
_Avoid_: kid, child, learner, pilot, operator, user

**School**:
The customer. Owns a set of drones and the teachers who use them.
_Avoid_: client, tenant, organisation, account

**Fleet**:
The set of drones belonging to one school. The unit the dashboard displays.
_Avoid_: swarm, group, batch, class set

### The aircraft

**Drone**:
One physical aircraft. Has a stable identity that survives being powered off, and a
human-readable name a teacher can match to the object in their hands.
_Avoid_: UAV, unit, vehicle, aircraft, device

**Drone Name**:
The human-readable name written on the aircraft — "Drone 3". What a teacher says out loud
across a room, and what every screen shows.
_Avoid_: callsign, tail number, label, title

**Drone ID**:
The stable machine identity that survives being powered off and outlives the name. Shown
only where a teacher needs to be certain which airframe a record refers to.
_Avoid_: callsign, serial, key

**Status**:
The single summary state of a drone. Exactly one of: Offline, Ready, Not Ready, Flying,
Fault.
_Avoid_: state, condition, health

**Offline**:
No recent contact with a drone. The normal resting state, not an error — most drones are
Offline most of the time. Carries no implication that anything is wrong.
_Avoid_: disconnected, down, dead, lost

**Ready**:
In contact, no faults, and charged enough to fly. The teacher can hand it to a student.
_Avoid_: OK, green, healthy, armed

**Not Ready**:
In contact, but something prevents flight — most often insufficient battery. Expected to
become Ready once addressed.
_Avoid_: unavailable, blocked, warning

**Fault**:
In contact, and something is wrong that the teacher cannot resolve before the lesson.
The drone should be taken out of service.
_Avoid_: error, broken, failed, critical

**Flying**:
Airborne right now.
_Avoid_: in flight, active, armed, airborne

**Needs Attention**:
The teacher-facing grouping of Not Ready and Fault. The dashboard presents two buckets —
usable and not usable — and reveals the precise Status only on request.
_Avoid_: problem, alert, issue

### Data

**Telemetry**:
Measurements reported by a drone about itself: battery, position, and whatever else the
aircraft can sense.
_Avoid_: data, metrics, readings, stats

**Last Contact**:
When telemetry was last received from a drone. Every displayed value is qualified by it.
_Avoid_: last seen, heartbeat, last update, timestamp

**Stale**:
Describes telemetry old enough that it may no longer be true. Stale values are always
shown with their age and never presented as current.
_Avoid_: cached, old, expired, outdated

**Telemetry Source**:
Where the dashboard gets telemetry from. Interchangeable: a real drone, or a simulator.
_Avoid_: feed, provider, backend, connection

### The lesson

The **nouns** here are education-first, and stay that way: Lesson, Exercise, Teacher, Student
are what a classroom actually contains, and they are not aviation's to rename.

One word was admitted from the other side on 2026-08-04 —
[ADR-0018](./docs/adr/0018-a-mission-is-a-first-class-record.md) adds **Mission**. The test it
passed is narrow and stays narrow: aviation's vocabulary is admitted only where it names
something education has no word for, never where it renames something education already owns.
A Lesson is still a Lesson.

**The register is not.** Superseded on 2026-07-28 by
[ADR-0015](./docs/adr/0015-a-professional-register.md): the board speaks in the register of
aviation and risk management. It reads *"5 of 6 serviceable"* rather than *"5 of 6 ready to
hand out"*, and *"Place on charge. Projected serviceable before the lesson."* rather than
*"Put it on charge — it should come back before the lesson."*

This was previously the opposite rule, and the change is a decision rather than a drift. What
survives it: every Alert still says what to *do*, a value that cannot be known is still said
in words rather than drawn as a zero, and severity is still spoken as time — `Now · Soon ·
Later`. Those are usability, not warmth. The **language** is English throughout and always
was; the register moved, not the language.

**Lesson**:
One period of teaching, from the check before it to the summary after it. The unit
everything else in this section belongs to. A Lesson contains one or more Missions.
_Avoid_: session, class, flight, sortie

**Mission**:
One run of a Mission Scenario inside a Lesson. Carries an objective, an airspace, ordered
Checkpoints, a time limit, and a score against stated success criteria. The thing a Teacher
sets up and a team flies.
_Avoid_: sortie, op, run, task

**Mission Scenario**:
The template a Mission is made from — Search and Rescue, Delivery, Building Inspection, or
one a Teacher writes. Holds the objective, the flow, the success criteria, the common risks,
and what each side watches. **A Lesson runs one Scenario at a time.** This is what a Teacher
picks, and it is what an Exercise used to be.
_Avoid_: mode, mission type, template, preset

**Exercise**:
One step within a Mission's flow — hovering, flying a square, landing on a mark. What a
Student is meant to be doing right now, which is the thing no Telemetry can report and the
thing a teacher compares behaviour against. A Teacher no longer picks these directly; the
Scenario supplies them.
_Avoid_: task, activity, manoeuvre, waypoint, objective

**Checkpoint**:
A place a Mission requires a Drone to reach, in order. Reaching one is progress; missing one
is a failure condition the Mission is scored on.
_Avoid_: waypoint, node, gate, marker

**Mission Zone**:
The area a Mission is meant to happen inside, drawn by the Teacher in metres from where the
Fleet was set up. A boundary in the Fleet's own frame and never a survey of the room
([ADR-0019](./docs/adr/0019-the-flight-area-is-drawn-in-the-local-frame.md)).
_Avoid_: geofence, boundary, perimeter, operating area

**No-fly Zone**:
An area inside or beside the Mission Zone that a Drone must stay out of. Entering one raises
an Alert and costs the Mission its score.
_Avoid_: exclusion zone, restricted airspace, keep-out, hazard area

**Clearance**:
The Teacher's permission for a team to take off. Granted per team per Mission and recorded
with who granted it and when. A Clearance is addressed to a Student, never to an aircraft,
which is why it is not a Command
([ADR-0021](./docs/adr/0021-clearances-and-instructions-are-records-not-commands.md)).
_Avoid_: approval, permission, authorisation, go-ahead

**Instruction**:
Something the Teacher tells a team to do mid-Mission — a new target, a new route, a changed
order of work. Recorded so a debrief can say when it was given. Also addressed to a Student
and also not a Command.
_Avoid_: order, directive, tasking, message

**Mission Planner**:
Where a teacher prepares a Lesson before it runs: which Scenario it runs, where the Mission
Zone and No-fly Zones are, which Students are flying, and which Drone each one takes.
_Avoid_: mission control, flight plan, ops plan, itinerary

**Assignment**:
The record of which Student flies which Drone for a Lesson. Written by the teacher, cleared
at the end of the lesson.
_Avoid_: pairing, allocation, booking, roster

### Oversight and control

**Flight Control Center**:
The screen a teacher watches while a Lesson is running: what needs them first, where every
Drone is, and what each one is doing. The Fleet board answers "can I hand this out"; this
answers "who needs me next".
_Avoid_: tower, control room, cockpit, command centre

**Alert**:
A condition raised during a Lesson that needs the teacher to act now — two Drones too close,
a Drone that has stopped responding while airborne, a charge about to run out. Every Alert
says what to do rather than what is true.

Deliberately **not** a synonym for Needs Attention, and the two must never be used for one
another. Needs Attention is a grouping of Status, asked before a lesson, about whether a
Drone can be handed out. An Alert is a live condition during one. A Ready Drone can raise an
Alert the moment it flies too close to another; a Needs Attention Drone sitting on a shelf
raises none.
_Avoid_: warning, notification, error, event

**Command**:
A request the teacher sends to a Drone — land, hold, stop. A request and never a guarantee:
what the Drone actually did is only ever known from the Telemetry that follows. Commands
reach simulated Drones only, and a Telemetry Source backed by real hardware refuses them
(ADR-0011).
_Avoid_: control, instruction, order, action
