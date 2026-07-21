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
A pupil who flies a drone during a lesson. Does not use the dashboard.
_Avoid_: kid, child, learner

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
