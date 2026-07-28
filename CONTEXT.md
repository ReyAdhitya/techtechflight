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
A pupil who flies a drone during a lesson. Does not use the dashboard. A Student is
assigned one Drone for a Lesson, and that pairing is something the Teacher records — no
Drone can report whose hands are on the controller.
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
everything else in this section belongs to. A Lesson contains one or more Exercises.
_Avoid_: session, class, flight, sortie, mission

**Exercise**:
One task within a Lesson — hovering, flying a square, landing on a mark. What a Student is
meant to be doing right now, which is the thing no Telemetry can report and the thing a
teacher compares behaviour against.
_Avoid_: task, activity, manoeuvre, waypoint, objective

**Mission Planner**:
Where a teacher prepares a Lesson before it runs: which Students are flying, which Drone
each one takes, and the sequence of Exercises. Lesson preparation — nothing about the word
is military, and nothing in it plans a flight path.
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
