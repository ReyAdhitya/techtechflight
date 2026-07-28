# Design

Phase 3. The complete user experience, from [`REQUIREMENTS.md`](./REQUIREMENTS.md) and
[`CONTEXT.md`](../CONTEXT.md). No implementation, no code — this says what a Teacher sees
and does, and why.

## Phase 2 questions, resolved

| # | Resolution | Consequence recorded in |
|---|---|---|
| 1 | The simulation runs **in the browser**. The Flight Control Center must demonstrate changing Telemetry, Drone movement, Status changes and simulated Commands. Simulation stays separate from future hardware integration | §1.3, §9. Needs an ADR in Phase 4 |
| 2 | **Flight Control Center** — American spelling, as a proper noun | §2 |
| 3 | **Mission Planner** is the internal name. The Teacher sees **Lesson Planner** | §2, §5 |
| 4 | **B7 dropped.** Behaviour is not compared to intent until an Exercise declares an expected phase. B6 stands — the Exercise is shown beside what the Drone is doing, and the Teacher makes the comparison | §4 |

---

## 1. What we take from control rooms, and what we refuse

The brief names air traffic control, SpaceX Mission Control and DJI FlightHub. Those are
three of the best-studied high-stakes interfaces in existence and there is a great deal to
learn from them. There is also a great deal in them that would actively harm this product,
and separating the two is the most important design decision in this document.

### 1.1 What we take — the structure

**One position, everything needed.** A controller does not navigate mid-sector. This is why
the running Lesson *moves into* the Flight Control Center rather than living beside it: once
a Lesson starts, a Teacher never has to change screen again.

**The queue is worked down, not read.** A controller's display gives them the next thing,
they act, and it advances. A wall of eleven simultaneous alerts is a failure state, not a
feature. This drives the whole attention bar in §4.

**Flight strips.** One row per aircraft, fixed anatomy, scannable by position rather than by
reading. The eye learns where charge is and stops re-finding it.

**Fixed spatial position.** Nothing reorders because something got worse. ADR-0004 already
established this for the Fleet board; control rooms reached the same conclusion for the same
reason — an element that jumps destroys the muscle memory that makes glancing possible.

**Intent beside behaviour.** A strip carries the cleared level as well as the actual level.
Ours carries the Exercise beside the flight phase (B6).

**Progressive disclosure under load.** Detail is available and never in the way.

### 1.2 What we refuse — the aesthetic

**Dark glowing chrome.** Mission Control rooms are dark because they are dark rooms. This is
a bright classroom, frequently on a projector, in daylight. ADR-0006 and ADR-0009 settled a
paper-and-marigold light theme on exactly this reasoning, and a dark cockpit skin would be
copying the surface of a solution to a problem we do not have.

**Density as a virtue.** A controller is a trained professional at a fixed station for a
whole shift. A Teacher is an educator standing at a podium with a class in front of them,
looking up for two seconds at a time. `CONTEXT.md` is explicit: *a classroom educator, not a
trained drone operator.* Density that rewards training is density that fails here.

**Colour-coded everything.** ADR-0004's rule holds without exception: colour is never the
sole carrier of meaning. Every Status, phase and severity carries a word and a shape.

**Numeric readouts as the primary language.** "0.4 m, −0.7 m/s" is a measurement where an
instruction belongs. Every Alert says what to *do*.

*Narrowed on 2026-07-28.* The refusal is about what is **primary**, not about numbers as
such. A Teacher asked for position on every strip, and a labelled coordinate group is now
carried there — **in addition to** the instruction, never instead of it. The Alert still
leads and still says what to do; the numbers sit on a line of their own beneath the head row,
where a Teacher who wants them can find them and a Teacher who does not is not made to read
past them. See §4.4.

**Skeuomorphic instruments.** Attitude indicators and horizon balls are for someone flying
the aircraft. Nobody flies from this screen.

So: **the structure of a control room, in the visual language this product already has.**
Where the two conflict, the ADRs win, because they were written about this room and these
users.

### 1.3 The simulation is part of the design, not a demo mode

With the simulation moving into the browser, the Flight Control Center becomes the first
screen where a Teacher can see Telemetry change, Drones move, Status turn over, and a
Command take effect. That is what makes the design demonstrable — and it introduces the risk
requirement C5 exists to prevent: a Teacher must never send a Command and then wonder whether
a real aircraft moved.

Two design rules follow, and they are not decorative:

1. **A simulated Fleet is labelled continuously**, in the persistent header, in the Teacher's
   own words — not a badge, not a colour, not a mode the eye stops seeing.
2. **Scenario triggers are physically separated from Commands** (C9). Landing a Drone and
   inventing a fault are different kinds of act. They never share a surface.

---

## 2. Terminology on screen

Following resolution 3's pattern: the product has internal names, and the Teacher sees
classroom words.

| Area (internal) | Navigation label | Screen heading |
|---|---|---|
| Flight Control Center | **Control** | Flight Control Center |
| Mission Planner | **Lesson** | Lesson Planner |
| Fleet Management | **Fleet** | *(the summary sentence is the heading)* |
| Student Operations | **Students** | Students |
| Reports | **Reports** | Reports |

Words that appear on screen, from `CONTEXT.md`: Teacher, Student, School, Fleet, Drone,
Drone Name, Drone ID, Status, Offline, Ready, Not Ready, Fault, Flying, Needs Attention,
Telemetry, Last Contact, Stale, Lesson, Exercise, Assignment, Alert, Command.

Words that never appear: pilot, callsign, user, operator, mission, sortie, UAV, unit,
vehicle, error, warning, notification.

Severity is spoken as time, not as danger: **Now · Soon · Later**. A Teacher deciding what to
do next needs an ordering, and "critical/warning/info" is a developer's vocabulary.

---

## 3. Navigation and page structure

### 3.1 Five destinations

```
Control      Fleet       Lesson        Students     Reports
(during)     (before)    (before)      (before)     (after)
```

Ordered by the Teacher's day, not alphabetically. **Fleet remains the default landing
screen** — a Teacher who only ever wants "which Drones can I hand out" must never have to
learn the rest, which is the reasoning ADR-0004 gave for having no navigation at all and
which still holds for the default.

**Settings** leaves the primary navigation and moves into the header. It is a room-and-records
screen, not a place in the workflow.

**History and Maintenance leave the primary navigation.** This is a change to a deliberate
authorial decision and needs its reason stated:

- Maintenance's *reliability ranking* and History's *timeline* both answer "what happened
  over time". They belong together, in **Reports**.
- Maintenance's *what needs doing this morning* half is a question about the Fleet **right
  now**, which is what the Fleet screen exists for. It moves there.

The Maintenance screen's own comment says the two halves are *"two different questions,
deliberately on one screen."* That is true, and it is exactly why they separate cleanly —
they were never one question. Nothing is lost; both surfaces survive with their content
intact. **Flag for approval: this is the one structural change in this document that
overrides an existing decision rather than extending it.**

### 3.2 When a Lesson is running

The navigation changes state. **Control** gains a quiet running indicator and the elapsed
time. Starting a Lesson from the Lesson Planner navigates straight to Control, because that
is where the Teacher now needs to be, and leaves them there.

### 3.3 Shared chrome

Present on every screen:

- **Header** — product identity; connection state; **the simulation label when the Fleet is
  simulated**; theme and display-scale controls; Settings.
- **Skip link** to content, first in the tab order.
- **Command palette** — `Ctrl`/`⌘`+K. Navigation only. It never touches a Drone, and it
  never sends a Command. A palette is precisely where that rule would quietly break.

### 3.4 Page frame

One column, centred, with a maximum width. Not a multi-panel cockpit: a Teacher reading at a
glance benefits from a single vertical order far more than from parallel panes, and a single
column is what survives a phone, a tablet and a projector without three layouts.

Order within every screen is fixed and identical in spirit: **what needs you → where things
are → the detail.**

---

## 4. Flight Control Center

The screen a Teacher watches. The only screen with Commands on it.

### 4.1 Layout, top to bottom

```
┌────────────────────────────────────────────────────────────┐
│ 1  LESSON STRIP        only while a Lesson is running      │
│    Year 8, period 3 · 12:04 · Exercise 2 of 4: Hover       │
│                                          [ End the lesson ]│
├────────────────────────────────────────────────────────────┤
│ 2  ATTENTION BAR                                           │
│    3  things need you                                      │
│    ▌ Now   Drone 3 — Separate it from Drone 1, 0.9m apart. │
│            Flown by Priya.            [ Acknowledge ]      │
├────────────────────────────────────────────────────────────┤
│ 3  THE SCOPE           Top-down · Side · Front (toggle)    │
│                                                            │
│         ·Drone 5                  ·Drone 1 ─────┐          │
│                                                 │ linked   │
│              ·Drone 3 ═══ Drone 1  conflict     │          │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ 4  FLIGHT STRIPS       one row per Drone, board order      │
│    ...                                                     │
└────────────────────────────────────────────────────────────┘
```

### 4.2 The attention bar — one thing at a time

This is the centre of the design and the clearest borrowing from a controller's position.

- A **count**, large: *"3 things need you"*. Present even at zero — *"Nothing needs you.
  Every Drone in contact is behaving."* A count that vanishes makes its reappearance an
  element materialising rather than a number changing.
- Beneath it, **exactly one Alert**: the worst, with its severity word, the Drone Name, the
  action to take, and the Student's name if one is assigned. Never a list.
- **Acknowledge** dismisses it and the next one takes its place. The count drops by one.

Showing one at a time is the whole point. Eleven alerts on screen is not information, it is
a demand that the Teacher do the triage the system was built to do. The strips below still
carry every Alert for a Teacher who wants the full picture; the bar carries *the next thing*.

**Acknowledgement behaviour** (F6–F8, F10): acknowledging changes only what the Teacher sees.
It never touches a Drone and never suppresses the condition anywhere else. An acknowledged
Alert collapses on its strip to a quiet line — *"Acknowledged · 2 min ago"* — so it is still
visible where the Drone is. It returns to the queue if its severity worsens, or if the
condition clears and later recurs.

### 4.3 The scope

Three pictures in one box, toggled in words: **Top-down** · **Side** · **Front**. Default
Top-down on every load; the choice is not remembered. Side is height against **north**; Front
is height against **east** (so the classroom row spreads on Front) — see
[ADR-0016](./adr/0016-a-side-view-on-the-scope.md) and
[ADR-0017](./adr/0017-a-front-view-on-the-scope.md). Conflict and link lines stay on Top-down
only.

A **Full screen** control (icon only, with `aria-label`) temporarily lifts the 600 px /
37.5rem cap (ADR-0014) via a fixed overlay centred in the viewport — Exit or Escape restores
the capped layout; the choice is not remembered. View toggles stay words and usable inside.

A plan view looking down, metres from where the Fleet was set up.

- Each Drone: a mark, its **Drone Name**, and its **height** as a number.
- **Conflict**: a solid line between two Drones that are too close. Deduplicated so a pair
  draws one line.
- **Linked group**: a dashed line, distinct from a conflict line by pattern and not only by
  colour.
- **Altitude** is carried by the mark's size *and* written under the Drone Name *and* stated
  in the strip. Size alone is not a reading. An airframe that cannot measure height shows no
  number at all — never `0.0 m`, which is what a Drone on the floor says (§11.1).
- **Selection is linked**: choosing a strip highlights its mark, and choosing a mark
  highlights its strip. Answering *"which one is that?"* is the question the scope exists for.
- **Below 640 px the Drone Name is all that is drawn.** Six labels in a short strip collide
  into one unreadable line, and the height is the longer of the two — and it is on the flight
  strip anyway. The name never goes: a scope of anonymous dots answers nothing.

**No room outline, no zones, no boundaries.** ADR-0012 defers the flight area because
absolute geometry needs an origin nobody has confirmed. Drawing walls would be modelling the
room by the back door, and the only walls that exist today are four numbers invented so the
simulated rangefinder has something to find.

**No scale reference either, as of 2026-07-28.** The scope drew a fixed grid captioned with
its cell size, and the caption read as a claim about what a cell measured on the glass — which
no page can know, since every monitor is a different size. The grid stays as an aid to
judging one distance against another; the caption is gone, and the readable quantity is the
height written on each mark. See `docs/adr/0014-a-fixed-scope-window.md`.

### 4.4 The flight strip

Fixed anatomy. The eye learns the positions.

```
┌──────────────────────────────────────────────────────────────────┐
│ Drone 3    Priya      1.7 m ↓0.4 m/s     63% · ~8 min            │
│                                            Response 2s ago       │
│ X 2.4 m E · Y 1.1 m N · Z 1.7 m                                  │
│ Exercise 2: Hover                                                │
│ Nearest aircraft: 0.9 m from Drone 1                             │
│ ▌Now  Separate it from Drone 1 — 0.9m apart.    [ Acknowledge ]  │
│ [ Land ]  [ Hold ]  [ More ▾ ]              [ Stop ]             │
└──────────────────────────────────────────────────────────────────┘
```

Left to right: **Drone Name · Student · height with direction · charge with time remaining ·
response age.** Then the coordinate group, Exercise, separation, Alerts, Commands.

**No phase word, as of 2026-07-28.** The strip read `Level · 2.6 m`, which is the same fact
twice — a Drone holding 2.6 m is what *Level* means — and the height carries the number the
word could not. The direction stays: an arrow and a rate answer *is it going up or down*,
which one height cannot give, and that is not the phase.

A Drone on the ground therefore reads `0.0 m`, with no arrow and no *steady*. That cell used
to be left empty because the phase word beside it already said "On the ground"; with the word
gone, an empty cell would leave the row silent about where the Drone is. An airframe that
cannot measure height still reads `Height not reported` rather than a zero (§11.1).

**The coordinates go on their own line and never into the head row.** Added 2026-07-28, on
every strip rather than only the selected Drone. The head row's five cells are the whole reason
this format is justified — the eye learns where charge is and stops re-finding it — and
threading three more numbers through it would push charge and response age sideways for a
value a Teacher reads far less often than either.

Format: `X 2.4 m E · Y 1.1 m N · Z 1.7 m`. Each axis carries its letter *and* its direction,
so the letters are learnable without being the only key. One decimal, because the Telemetry is
rounded to two and a third digit would be precision it has not got.

- **A Drone that has reported no position renders no line at all** — not a row of dashes. A
  group full of placeholders reads as a measurement that failed, when none was offered.
- **A height that was never reported reads `Z not reported`**, never `0.0`. An airframe with
  no barometer and one sitting on the floor are different facts (§11.1). A Drone that measures
  zero shows `Z 0.0 m`, which is a reading.
- **A direction is only claimed where there is one.** At exactly zero the letter is dropped:
  0 m east and 0 m west are the same place.

The same readout appears in the Drone detail dialog, in the same format, so opening a Drone
does not make a Teacher learn a second one.

Strips stay in `DroneRegistration.boardOrder` — the same fixed places as the Fleet tiles
(§1.1). Alerts may light a strip or change its numbers; they must not move the row. Urgency
is the Attention bar's job (`alertQueue`, worst first). A Teacher who learned "worst floats
to the top" on this list was reading a defect that felt deliberate.

Rows have real height rather than an expanded hit area. A strip wraps its Alerts onto
following lines, and those lines paint over an expanded target — leaving the bottom half of
it unclickable on a tablet. This was found and fixed once already; it is recorded here so it
is not reintroduced.

### 4.5 Commands

**Land** and **Hold** are on every strip, always visible. They are what a Teacher reaches for.
**More** holds auto-land and anything added later. Commands are absent from every other
screen in the product.

**Emergency stop is a guarded control** labelled **Stop**. It sits apart on the right, and it
is a **press-and-hold** — roughly a second, with a ring that fills — rather than a button
behind a confirmation dialog. The reasoning: an emergency stop needs to be fast, and a modal
is not fast; but an accidental emergency stop on the wrong Drone is worse than a slow one.
Physical guarded switches solve this exact problem with deliberate effort rather than with a
question. It satisfies C8 without a dialog to dismiss.

Once Telemetry shows the latch (`emergency` phase), the control **must not** still read as
Stop. It becomes **Release stop** on a simulated Fleet (clearing the latch), or stays present
but unavailable with the reason in words on a hardware Fleet that cannot release from here
(§9).

For keyboard and switch users, press-and-hold is not available. Focus plus `Enter` opens an
explicit confirmation step instead. Two paths, same guarantee.

**Command feedback obeys C4 absolutely.** Nothing is optimistic. After sending, the strip
reads *"Land — sent"*, then *"Land — waiting for a response"*, and only ever shows the Drone
as landed when Telemetry says it is. A Command that produced no change looks exactly like a
Command that produced no change. A Drone that stops responding after a Command reads
*"Land — sent, no response since"* (C6).

### 4.6 States

| State | What the Teacher sees |
|---|---|
| Before the first Fleet State | *"Waiting for the first Fleet State."* Not an empty grid |
| Ground station unreachable | The last known Fleet, with the connection said in words about the board. The Lesson keeps running |
| Nothing wrong | *"Nothing needs you. Every Drone in contact is behaving."* Strips in stable order |
| Every Drone Offline | Stated as Drones being Offline — never as the board being broken |
| Fleet has no Drones | A fact about the Fleet, with a route to Settings |
| Simulated Fleet | The header label, continuously |

---

## 5. Lesson Planner

Internally the Mission Planner. The Teacher sees **Lesson Planner**, because they are
preparing a lesson.

### 5.1 Before a Lesson

```
┌────────────────────────────────────────────────────────────┐
│ 5  of 6 ready to hand out                                  │
│ Enough for 5 Students flying at once.                      │
├────────────────────────────────────────────────────────────┤
│ STANDING IN THE WAY                                        │
│ Drone 2 · Not Ready · Put it on charge — it should come    │
│                       back before the lesson.              │
├────────────────────────────────────────────────────────────┤
│ THE LESSON                                                 │
│ What is this lesson?  [ Year 8, period 3            ]      │
├────────────────────────────────────────────────────────────┤
│ WHO FLIES WHAT                                             │
│ Drone 1   [ Priya          ]                               │
│ Drone 2   [                ]  Not Ready                    │
│ Drone 3   [ Ravi           ]                               │
│ ...                                                        │
├────────────────────────────────────────────────────────────┤
│ EXERCISES                                                  │
│ 1. Hover and hold           5 min   [↑][↓][×]              │
│ 2. Fly a square             10 min  [↑][↓][×]              │
│ [ + Add an exercise ]                                      │
├────────────────────────────────────────────────────────────┤
│              [ Start the lesson ]                          │
└────────────────────────────────────────────────────────────┘
```

**Assignment is a column of Drones with a name field beside each.** Drones stay in board
order, so the muscle memory built on the Fleet screen transfers. `Tab` moves down the column.
Names autocomplete from the saved class list (D6). A Teacher assigns six in well under thirty
seconds, which is the actual constraint.

Not drag-and-drop: hostile on touch, slow with a keyboard, and wrong for someone standing.

Inline, beside the row that causes it:
- *"Drone 2 is Not Ready"* (E5, and out-of-service Drones say so too)
- *"Drone 3 is already assigned to Ravi"* (D7)
- *"7 Students, 5 Ready Drones"* above the block (E4)

**Exercises** are an ordered list. Reorder with up/down controls, not by dragging — the same
reasoning. Duration is optional; an Exercise with no duration is normal, not incomplete.

**"Start the lesson" is always enabled** (E7). Every panel above it is optional. A Teacher
who opens the board at 08:55 with a class arriving presses it immediately and everything
still works — no name, no exercises, no plan. Planning is an affordance, never a gate. This
is the requirement most likely to be destroyed by building the rest of this screen.

### 5.2 While a Lesson is running

The Lesson Planner is not where the Teacher should be. It shows a short card — *"Year 8,
period 3 is under way"* — with the elapsed time and one control: **Go to the Flight Control
Center**. Everything about running the Lesson lives there.

### 5.3 Earlier lessons

A short list underneath, each linking to its report. Full reports live in Reports.

---

## 6. Fleet Management

The board. Still the product, still the default, and structurally unchanged — every
requirement in §3.A of `REQUIREMENTS.md` is already met and none of it moves.

```
┌────────────────────────────────────────────────────────────┐
│ 5  of 6 ready to hand out          1 needs attention       │
├────────────────────────────────────────────────────────────┤
│ TILES — fixed board order, never reordered                 │
│ ┌────────┐ ┌────────┐ ┌────────┐                           │
│ │Drone 1 │ │Drone 2 │ │Drone 3 │  ...                      │
│ └────────┘ └────────┘ └────────┘                           │
├────────────────────────────────────────────────────────────┤
│ WHAT NEEDS DOING            (moved from Maintenance)       │
│ Drone 2 · Put it on charge          [ Out of service ▾ ]   │
└────────────────────────────────────────────────────────────┘
```

Tiles keep their present anatomy — every value carries its age, a Drone that has never
responded says so plainly, Status is a word and a shape, and colour outlines a tile rather
than filling one. Nothing here is redesigned, because nothing here is failing.

**What needs doing** arrives from Maintenance: an actionable list, in the order it can be
acted on, with the service-state control beside each Drone. It is the same question the tiles
answer, in the form a Teacher can work through.

Search and filtering still appear only once the Fleet is large enough that finding a Drone
has stopped being a glance and started being a search.

---

## 7. Students

Internally Student Operations. The Teacher sees **Students**.

### 7.1 A design principle for this screen

**This screen records Drones, never children.** A Student is shown which Drone they flew and
in which Lesson. It does not accumulate incidents against their name.

The reason is both ethical and factual. Factually, a Drone that faults did not fault because
of who was holding the controller, and a record implying otherwise is simply wrong.
Ethically, a system that quietly builds a failure history against a named child in a school
is not something to construct by accident while adding a feature. If that is ever wanted, it
is a deliberate decision with a safeguarding conversation attached, not a side effect of
Assignment.

### 7.2 Structure

1. **The class** — the saved list of Student names (D6). Add, rename, remove. This is what
   makes assignment fast next period, and it is the only Student data the product keeps.
2. **Today** — who is flying what right now, each with the Drone's Status and any Alert.
   During a Lesson this answers *"who do I need to speak to"* from the other direction to
   the Control Center. Assignments are cleared here in one action at the end (D4).
3. **Which Drones a Student has flown** — Drone Name, Lesson, Exercises. Nothing else.

---

## 8. Reports

The *after* screen. Three sections, stacked, in the order the questions get asked.

### 8.1 Lessons

A list of closed Lessons, each opening a **Lesson report**:

- Lesson name, date, start and end time
- Students and the Drone each flew
- Exercises run
- Incidents, in time order, each naming its Drone
- Per-Drone counts — faults, dropouts, flights
- **Commands issued** during the Lesson (C7)

Captured as the Lesson closes rather than recomputed later, because the ground station's
history is bounded and by next week these events will have aged out of it. A report that
quietly emptied itself would be worse than no report.

### 8.2 Fleet reliability

Which Drone keeps giving trouble, across every retained Lesson — merging saved counts with
live history and never counting the overlap twice. This is the number a Teacher takes to the
supplier, which is why it must not be inflated.

### 8.3 Timeline

The full event history: what happened, when, filterable by Drone. Unchanged from the History
screen it comes from.

### 8.4 Printing

A Lesson report prints (G3). This is a real constraint and shapes the design:

- **Black and white on A4.** No meaning may depend on colour — which the product already
  guarantees, so severity prints as its word and its shape.
- The header carries School, Lesson, and date, because a printed page has no navigation and
  no context.
- Chrome, navigation and controls do not print.
- Nothing scrolls; the report is a document, not a viewport.

---

## 9. Simulation, on screen

With the simulation in the browser, this is now part of the product's surface rather than a
deployment detail.

**The label.** Whenever the Fleet is simulated, the header says so in the Teacher's own
words — *"Simulated Fleet — no aircraft are being contacted"* — continuously and in text. Not
a coloured dot, not a corner badge. A Teacher must never be uncertain which Fleet they are
commanding (C5), and the way a persistent badge fails is that the eye stops seeing it.

**Commands behave identically.** A simulated Command is sent, acknowledged and reflected
through Telemetry exactly as a real one would be. That is the point — the interaction is
what we are designing, and a simulated path that behaved differently would teach the wrong
thing.

**Scenario controls are separate, and are not Commands** (C9). Inventing a fault, dropping a
link or flattening a battery are demonstrations of the *world* misbehaving, not requests to
an aircraft. They live in their own panel in Settings, under their own heading, and never
appear on a flight strip. Putting them beside **Land** would teach a Teacher an interaction
that cannot exist on real hardware — which would make the demonstration a lie about the
product.

**A hardware Fleet refuses Commands visibly.** When the Telemetry Source is real, the Command
controls are present but plainly unavailable, with the reason in words. A control that
silently did nothing would be worse than one that is not there; one that is not there at all
would leave a Teacher wondering whether they had missed it.

---

## 10. Components

| Component | Status |
|---|---|
| Header, connection banner, theme and scale controls, command palette, skip link | Reuse |
| Drone tile, Status badge and glyph, battery level, battery chart, event timeline | Reuse |
| Drone detail, flight instruments | Reuse |
| Formation map → **the scope** | Extend — linked selection, altitude in the mark |
| Flight strip | Extend — Exercise line, Command row, acknowledged-Alert line |
| Attention bar | Extend — one Alert at a time, Acknowledge |
| Simulation label | New |
| Command button, guarded (press-and-hold) control | New |
| Assignment column, Student name field with autocomplete | New |
| Exercise list with reordering | New |
| Lesson report, print stylesheet | New |
| Scenario panel (Settings) | New |

---

## 11. States, motion and conditions

### 11.1 States

Every screen draws all five: **loading, empty, partial, error, ideal.** The ones most often
skipped, and their required behaviour, are already enumerated in §4 of `REQUIREMENTS.md`.
Two rules apply everywhere:

- **A value that cannot be known is said in words, never drawn as a zero.** An airframe with
  no rangefinder and one that sees clear air are different facts and never get the same
  picture.
- **Absence degrades to less, never to broken.** No history means no timeline, not an error.

### 11.2 Motion

Restrained, and it earns its place or it goes.

- **Nothing that changes position on the arrival of bad news.** An Alert appearing must not
  move the thing a Teacher is reading. It occupies its space before it has content.
- Counts **transition, not animate** — a number changing reads instantly; a number tumbling
  reads as decoration.
- Drone marks on the scope move at the cadence of Telemetry, not on an easing curve. A smooth
  interpolation would be inventing positions the Fleet never reported.
- Acknowledged Alerts collapse with a short fade — this is the one place motion helps, since
  it confirms the act.
- `prefers-reduced-motion` removes all of it with nothing lost.

### 11.3 Conditions of use

Bright classroom · projector · a Teacher standing · a noisy room · hands busy · no internet.

- Tap targets at least 44px on phones and tablets, verified by hit-testing rather than by
  reading the CSS.
- Every screen and every Drone reachable by keyboard; the palette at `Ctrl`/`⌘`+K.
- Colour never the sole carrier of meaning.
- One column, so a phone, a tablet and a projector are one layout rather than three.
- The relative type scale and large format hold (ADR-0008): the room decides what is
  readable, not the stylesheet.

---

## 12. What this design does not do

Stated so it is not mistaken for an oversight:

- **No flight area, zones or boundaries.** ADR-0012. The scope shows where Drones are, not
  where they are allowed to be. This costs the design its most ATC-looking feature, and that
  is an honest limitation rather than a hidden one.
- **No Commands to real hardware.** ADR-0011.
- **No behaviour-versus-intent alerting.** B7 dropped per resolution 4. The Exercise is shown
  beside the phase and the Teacher makes the comparison.
- **No dark cockpit theme.** §1.2.
- **No per-Student incident history.** §7.1.
- **No multi-panel dense layout.** §3.4.

## 13. For approval before Phase 4

1. **History and Maintenance leaving the primary navigation** (§3.1) is the one change here
   that overrides a deliberate existing decision rather than extending it. Both surfaces
   survive with their content intact, but the call is yours.
2. **Press-and-hold for emergency stop** (§4.5) is an unusual pattern and worth an explicit
   yes. The alternative is a confirmation dialog, which is slower in the moment it matters.
3. **Browser-based simulation needs its own ADR in Phase 4** — it puts a Telemetry Source in
   the browser, which touches the seam ADR-0001 drew and the split ADR-0003 made. The design
   above assumes it; the architecture has to justify it.
