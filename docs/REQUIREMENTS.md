# Requirements

Phase 2 of the Flight Traffic Control redesign. Written from
[`CODEBASE_AUDIT.md`](./CODEBASE_AUDIT.md), ADRs [0010](./adr/0010-retire-the-vite-dashboard.md),
[0011](./adr/0011-commands-reach-the-simulated-fleet-only.md) and
[0012](./adr/0012-the-mission-planner-plans-people-and-exercises-not-the-room.md), and the
terminology decisions now recorded in [`CONTEXT.md`](../CONTEXT.md).

No design and no implementation. This says *what must be true*, not what it looks like.

## How to read this

Every requirement has an ID so Phases 5 and 7 can trace against it, and a status:

- **Exists** — already built and verified. **It may not be removed or weakened without an
  ADR.** Listed so the redesign cannot quietly drop it.
- **Extend** — exists, but must change to meet the redesign.
- **New** — does not exist.

Counts: **46 Exists · 8 Extend · 24 New**, plus one item recorded as out of scope. The
redesign is mostly a matter of connecting and completing what is already there, which is the
honest shape of the work — and worth saying plainly, because "redesign into a Flight Traffic
Control System" sounds like a rewrite and is not one.

## 1. Who this is for, and when

A Teacher: a classroom educator, not a trained drone operator. They use this at three
moments, and every requirement below serves one of them.

| Moment | Question | Screen |
|---|---|---|
| **Before** — the night before, or 08:55 | "Can this lesson go ahead, and who is flying what?" | Mission Planner, Fleet board |
| **During** — watched, not glanced at | "Who needs me next?" | Flight Control Center |
| **After** — the ten minutes at the end of the day | "What broke, and which Drone keeps doing it?" | Reports, Maintenance, History |

The conditions are not incidental and are treated as requirements in §3.I: a bright
classroom, often a projector, a Teacher standing at a podium with a class in front of them,
hands busy, a noisy room, and a school network with no internet.

## 2. Teacher workflow

The spine the whole product hangs on. Each stage names the requirements that serve it.

1. **Prepare** — record who is in the class, which Drone each Student takes, and the
   sequence of Exercises the Lesson runs through. → §E, §D
2. **Check** — confirm enough Drones are Ready, see what stands in the way, and act on it
   in the order it can be acted on. → §A, §E4–E5
3. **Run** — watch the Lesson. Attention is directed rather than searched for; act on what
   needs acting on; work the queue down. → §B, §F, §C
4. **Close** — end the Lesson, capturing what happened before the evidence ages out of the
   ground station's bounded history. → §G
5. **Review** — read what happened, and decide which Drone goes back in the cupboard or
   back to the supplier. → §G, §A

Stage 3 is the only one that is *watched*. Stages 1, 2 and 5 are read. Stage 4 is a single
action. That asymmetry should drive every design decision in Phase 3.

## 3. Requirements

### A. Fleet monitoring

| ID | Requirement | Status |
|---|---|---|
| A1 | Every Drone the School owns is shown, whether or not it has ever responded | Exists |
| A2 | Drones hold a fixed board position and never reorder as Status changes | Exists |
| A3 | Every displayed value is qualified by its age | Exists |
| A4 | Stale Telemetry is shown with its age and never presented as current | Exists |
| A5 | A Drone that has never responded is distinguishable from one that has fallen silent | Exists |
| A6 | A reading an airframe cannot take is said in words, never drawn as a zero | Exists |
| A7 | Status is carried by word and shape, not by colour alone | Exists |
| A8 | Loss of the ground station is stated in words about the board, not about the Drones | Exists |
| A9 | The last known Fleet stays on screen while the ground station is unreachable | Exists |
| A10 | A return-to-Ready forecast appears only from charge actually observed rising | Exists |
| A11 | Search and filtering appear only once the Fleet is too large to glance at | Exists |
| A12 | A School with no Drones registered is told so, rather than shown an empty answer | Exists |

### B. Flight Control Center

| ID | Requirement | Status |
|---|---|---|
| B1 | One screen, in fixed order: what needs the Teacher, then where everything is, then per-Drone detail | Exists |
| B2 | The screen is named **Flight Control Center** throughout — route, heading, navigation | Extend |
| B3 | Each Drone shows Status, flight phase, height with direction, charge with time remaining, response age, and nearest Drone | Exists |
| B4 | Drones are ordered worst-first, weighted by how many Alerts they hold within a severity, with Drone Name as a stable final tiebreak | Exists |
| B5 | Each Drone shows the **Student** assigned to it | Extend |
| B6 | Each Drone shows the **Exercise** it is meant to be doing | New |
| B7 | A Drone whose behaviour does not match its Exercise is surfaced as a distinct kind of attention | New — conditional, see note |
| B8 | Every derived value lives in one module and is computed nowhere else | Exists |
| B9 | The screen is readable at a glance of two seconds: the first line answers "who needs me" without reading the rest | Exists |

**Note on B7.** This cannot be specified until an Exercise declares what it expects — for
instance that "hover" expects the phase `level`, or that "landing practice" expects
`descending`. That mapping is a Phase 3/4 design decision. B6 stands alone and is worth
building regardless: showing intent next to behaviour lets the Teacher make the comparison
even where the system cannot.

### C. Flight control — commands

Governed by [ADR-0011](./adr/0011-commands-reach-the-simulated-fleet-only.md). Every entry
here is New.

| ID | Requirement | Status |
|---|---|---|
| C1 | A Teacher can send a Drone a Command: land, hold, auto-land, emergency stop | New |
| C2 | Commands travel board → ground station → Telemetry Source. The board never addresses a Drone | New |
| C3 | Only a simulated Telemetry Source accepts Commands. A hardware-backed source refuses structurally, not by configuration | New |
| C4 | The board never optimistically updates. What a Drone did is known only from the Telemetry that follows | New |
| C5 | It is never possible to send a Command and be uncertain whether a real aircraft was involved | New |
| C6 | A Command to a Drone that is not responding is shown as sent and unacknowledged, never as done | New |
| C7 | Every Command issued during a Lesson is recorded in that Lesson's record | New |
| C8 | Emergency stop is confirmed before it is sent, and is the only Command that is | New |
| C9 | **Scenario triggers are never presented as Commands** | New |
| C10 | The ground station's stdin scenario keys remain until the interface covers the same ground | Exists — retain |

**Note on C9, which matters more than it looks.** The simulator exposes two different kinds
of thing. *Commands* are what a Teacher would plausibly send a real aircraft — land,
auto-land, stop. *Scenario triggers* make the world misbehave — inject a fault, drop the
link, flatten a battery. Only the first may ever appear in a Teacher's interface. Dressing
the second as a Command would teach a Teacher an interaction that can never exist on real
hardware, and would make the demonstration a lie about the product.

### D. Student management

| ID | Requirement | Status |
|---|---|---|
| D1 | A Teacher can record which Student flies which Drone | Exists |
| D2 | The word **Student** replaces "pilot" in code as well as on screen | Extend |
| D3 | An Assignment is edited in place, fast enough to enter a full class before a Lesson starts | Exists |
| D4 | Every Assignment can be cleared at the end of a Lesson in one action | Exists |
| D5 | The assigned Student appears wherever the Drone needs the Teacher to act — "go and speak to Priya" beats "go and look at Drone 3" | Exists |
| D6 | Student names persist between Lessons so a class is not retyped every period | New |
| D7 | One Drone cannot be assigned to two Students at once | New |
| D8 | Assignments survive the ground station restarting | Exists |
| D9 | A Lesson can run with no Assignments recorded at all | Exists — must not regress |

### E. Mission Planner

Scope fixed by [ADR-0012](./adr/0012-the-mission-planner-plans-people-and-exercises-not-the-room.md).

| ID | Requirement | Status |
|---|---|---|
| E1 | A Teacher can prepare a Lesson before it runs: its label, its Students, their Drones, and its Exercises | New |
| E2 | A Lesson contains an ordered sequence of one or more Exercises | New |
| E3 | An Exercise has a name, and may have an intended duration | New |
| E4 | The planner says when more Students are assigned than there are Ready Drones | New |
| E5 | The planner excludes Drones the Teacher has taken out of service, and says which and why | Extend |
| E6 | A prepared Lesson can be started, becoming the running Lesson | Extend |
| E7 | **A Lesson can be started with no plan at all** | New |
| E8 | The planner does not model the flight area | Out of scope — ADR-0012 |

**Note on E7.** The pre-flight check works today with no preparation whatsoever, and a
Teacher who opens the board at 08:55 with a class already arriving must still be able to
start. Planning is an affordance, never a gate. This is the requirement most likely to be
lost while building E1–E6, so it is stated explicitly.

### F. Alerts

| ID | Requirement | Status |
|---|---|---|
| F1 | Alerts are derived from Telemetry and ranked by severity | Exists |
| F2 | Every Alert says what to do, not what is true | Exists |
| F3 | Every Alert carries the moment its condition began | Exists |
| F4 | An Alert whose condition clears forgets its start, so its return reads as new | Exists |
| F5 | The whole Fleet's Alerts form one queue, worst first | Exists |
| F6 | **A Teacher can acknowledge an Alert, and it leaves the queue** | New |
| F7 | An acknowledged Alert returns if its condition clears and then recurs | New |
| F8 | Acknowledging changes only what the Teacher sees. It never touches a Drone, and never suppresses the underlying condition anywhere else | New |
| F9 | The number of things needing the Teacher is legible without reading any detail | Exists |
| F10 | An Alert that worsens while acknowledged returns to the queue | New |

**Note on F6.** This is the difference between a status board and a controller's position.
A controller works a queue *down*; the current screen only reports. It is buildable now
because Alert start times became stable and trackable in `web/lib/vitals.ts`.

### G. Flight reports

| ID | Requirement | Status |
|---|---|---|
| G1 | Closing a Lesson captures its incidents and per-Drone counts before they age out of the ground station's bounded history | Exists |
| G2 | A Lesson report shows label, times, Students, Drones, Exercises, incidents, per-Drone counts, and Commands issued | Extend |
| G3 | A report is printable on a school printer | New |
| G4 | Records can be exported and re-imported without loss, including fields added by later builds | Exists |
| G5 | Reliability across Lessons distinguishes a Drone having a bad day from one that should go back to the supplier | Exists |
| G6 | A report remains readable after a Drone has been sent back — names are captured, not looked up | Exists |

### H. Records and persistence

| ID | Requirement | Status |
|---|---|---|
| H1 | Teacher-authored records live in one browser, because the board holds no server and sends nothing but Commands | Exists |
| H2 | That limitation is stated plainly to the Teacher rather than discovered | Exists |
| H3 | A storage failure degrades to in-memory for the session, never to a broken board | Exists |
| H4 | Two tabs open on one Fleet never show two different records | Exists |
| H5 | Counting an event twice is impossible when live history and saved Lessons overlap | Exists |
| H6 | **The growing weight of what is stored in one browser must be addressed, not accumulated** | New — decision required |

**Note on H6.** Today this is notes, service decisions, Lessons and Assignments. The
redesign adds Exercises, plans, Commands and reports — a term's worth of a Teacher's work in
`localStorage`, lost with a cleared cache or a different laptop. Audit finding F6. This
requires a decision in Phase 4, and the options are not equal: an export reminder is cheap
and weak; a file-backed record needs the ground station and therefore an ADR.

### I. Conditions of use

| ID | Requirement | Status |
|---|---|---|
| I1 | The whole system works with no internet | Exists |
| I2 | The board sends nothing to the ground station **except Commands** (C2, C3) | Extend |
| I3 | The board is readable from a few steps away and on a projector | Exists |
| I4 | Colour is never the sole carrier of meaning | Exists |
| I5 | Every tap target is at least 44px on phones and tablets | Exists |
| I6 | Every screen and every Drone is reachable by keyboard | Exists |
| I7 | The board works on iOS, Android, tablets and desktop | Exists |
| I8 | No screen requires a server | Exists |
| I9 | The ground station serves the board a School actually uses | Extend — audit F2 |

## 4. Edge cases

Grouped by what goes wrong. Each states the behaviour required, not the implementation.

### Contact and trust

| Case | Required behaviour |
|---|---|
| A Drone has never responded | Distinguishable from one that fell silent. No invented values |
| Telemetry goes Stale mid-Lesson | Shown with its age; the summary count says so when what it counted is Stale |
| A Drone goes Offline mid-Exercise | Its Assignment and Exercise remain; the Drone is not quietly dropped from the Lesson |
| The ground station becomes unreachable mid-Lesson | The Lesson keeps running. Last known Fleet stays. Said in words about the board |
| The ground station restarts mid-Lesson | The Lesson survives. History reseeds; already-counted events are not counted again |
| The browser clock and the ground station clock disagree | Ages are computed from when the snapshot arrived, never by trusting a remote timestamp |
| A Drone responds again after a long silence | Reads as a return, not as a new Drone |

### Commands

| Case | Required behaviour |
|---|---|
| A Drone goes Offline before acting on a Command | Shown as sent and unacknowledged. Never as done |
| The Telemetry Source is real hardware | The Command is refused, and the refusal is visible to the Teacher rather than silent |
| A Command asks for something already true | Harmless. No error presented for a Drone that is already landed |
| Emergency stop on a Drone already on the ground | Permitted, and its effect is honest — it latches, and someone must go to it |
| The socket drops between issuing and delivering | Treated as unacknowledged; never retried silently in a way that could act twice |
| Two Commands in quick succession | The later does not silently cancel the earlier without saying so |
| A Command is issued to a Drone with no Student assigned | Permitted. Assignment is a record, never a permission |

### Assignment and planning

| Case | Required behaviour |
|---|---|
| A Student's Drone becomes Fault mid-Lesson | Surfaced with the Student's name. The Assignment is not silently cleared |
| A Student is assigned an out-of-service Drone | The planner says so before the Lesson starts |
| More Students than Ready Drones | Stated at planning time with the shortfall named (E4) |
| The same Drone assigned to two Students | Prevented (D7) |
| A Drone is assigned but never responds | The Lesson still starts. The Drone appears as never having responded |
| A Lesson starts with no plan | Fully supported (E7) |
| The Exercise sequence finishes before the Lesson does | The Lesson continues. No Exercise is shown rather than a wrong one |
| A Lesson is ended while a Drone is still Flying | Permitted, and recorded as it was — not rewritten to look tidy |
| A Lesson is left running overnight | Recoverable. A Lesson with an implausible elapsed time is not silently discarded |

### Records

| Case | Required behaviour |
|---|---|
| `localStorage` is unavailable or full | Board works; records held in memory for the session; the Teacher is told |
| A record is imported from an older build | Every missing field defaults. Last term's records come back, not an error |
| Records are cleared mid-term | Only ever by explicit confirmation |
| Two tabs are open on one Fleet | Both show the same records |
| Live history overlaps an already-counted Lesson | Counted once (H5) |

### Fleet shape and sensing

| Case | Required behaviour |
|---|---|
| The Fleet has no Drones | Said as a fact about the Fleet, not about the ground station |
| The Fleet is larger than the tile layout expects | Degrades to a searchable list rather than an unreadable grid |
| An airframe has no rangefinder | Never drawn like one that sees clear air |
| A Drone does not report its position | No separation is claimed for it. Absent, not zero |
| Batteries are swapped rather than charged in place | No forecast is offered. Silence is the correct answer |
| Emergency stop is latched on the ground | Reads as a latched stop, not as an aircraft falling |
| Every Drone is Offline | Not mistaken for the board being unreachable |

### Alerts

| Case | Required behaviour |
|---|---|
| An Alert clears and returns | Reads as new, with a new start time (F4) |
| Many Alerts arrive at once | The queue orders them; the Teacher is never asked to triage a flat list |
| An acknowledged Alert's condition worsens | Returns to the queue (F10) |
| An Alert is raised on a Drone with no Student assigned | Shown with the Drone Name alone. Assignment is not required for an Alert to be useful |
| Nothing is wrong at all | Said plainly, with a stable order underneath rather than a reshuffling one |

## 5. Out of scope

| Item | Why | Recorded in |
|---|---|---|
| Flight area, zones, no-fly boundaries | Absolute geometry needs an origin nobody has confirmed. Relative separation survives that uncertainty; a boundary does not | ADR-0012 |
| Commands to real hardware | No protocol, open Tier 0 question, and real aircraft near children | ADR-0011 |
| A camera stream URL carried in Telemetry | A telemetry-supplied URL is an injection surface. Only `streaming: boolean` is carried | Existing contract |
| Cloud sync of Teacher records | The system works with no internet and holds no account | ADR-0002 |
| Thresholds editable from the board | They are properties of the room and the radio; two copies would drift | Existing design |

## 6. Traceability to audit findings

| Finding | Addressed by |
|---|---|
| F1 — two board implementations | ADR-0010 |
| F2 — ground station serves the old board | I9, ADR-0010 |
| F3 — "control" versus read-only | §C, ADR-0011 |
| F4 — screens after the Fleet board are untested | Phase 7; no requirement is complete without coverage |
| F5 — the deployed demo cannot animate | **Not yet addressed by any requirement — see §7** |
| F6 — records are browser-local | H6 |
| F7 — dead RSC prefetch | I3 (quality of use), no dedicated requirement |
| F8 — `/showcase` ships three.js | No requirement. A Phase 4 decision |

## 7. Open questions

1. **Audit finding F5 has no requirement, deliberately.** The deployed demonstration is a
   still frame: altitude never changes, so `climbing` and `descending` are unreachable and
   the radar scope cannot move. Meanwhile a genuinely good simulator sits in
   `ground-station/` where the static deploy cannot reach it. Whether the browser gets a
   real simulation, or the demo stays a fixture, is an architecture question for Phase 4 —
   but it decides whether §B and §C can be *seen* working by anyone without a Node process.
   I recommend it be answered before Phase 5 sequences any of this.
2. **"Flight Control Center" is American spelling in a British-English product.** Everything
   else reads *organisation*, *colour*, *metres*, *recognises*. Either the screen is the
   Flight Control **Centre**, or this is a deliberate proper noun. It is a one-word decision
   that will otherwise be made accidentally forty times.
3. **Does the Teacher ever see the words "Mission Planner"?** The glossary now defines it as
   lesson preparation, and the terminology rule is education-first. A screen labelled
   *Mission Planner* sits oddly beside that. My recommendation: keep **Mission Planner** as
   the internal name for the feature, and label the screen for what the Teacher is doing —
   preparing a Lesson.
4. **B7 needs an Exercise to declare what it expects** before behaviour can be compared to
   intent. Phase 3 should either define that mapping or drop B7 and keep B6.
