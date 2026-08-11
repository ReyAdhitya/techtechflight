# Two tabs, a way out, and looking back

Decided with the product owner on 2026-08-11, while trying to test both sides of the product
at once and finding they could not.

Five items. One is a defect that traps a child on a screen with no exit.

## 1. Two tabs, two roles

**The problem.** The role is remembered per browser, so every new tab inherits whichever role
was last chosen. Opening a second tab to test the Teacher side gives you a second Student.

**Decided: the address decides the role for that tab.**

```
techtechflight.vercel.app/mission    →  Teacher
techtechflight.vercel.app/student    →  Student
```

Two tabs, both roles, at the same time, in one browser, with no switching. The remembered
role is used only to route someone who opens the bare address with nothing after it.

**The safety promise is untouched.** A child typing `/mission` is stopped at the PIN. The lock
was never the hidden button; it is the PIN, and it stays exactly where it is.

## 2. The screen with no way out. A defect

`StudentMissionScreen:270` gives the exit only when the Drone is **not** airborne.

The owner's tablet had not heard the board for **17 hours**. The last reading it ever received
said airborne, and the app still believed it. So a Drone that has not existed since yesterday
kept a child on "Land and wait" with nothing to press, permanently.

**Decided: the way out appears when the Drone is down, or when the board has gone quiet.**

A child genuinely flying should not be tapping "leave" while holding an aircraft. But silence
for seventeen hours is not flight, and the heartbeat already knows the difference. It was
built two waves ago for exactly this kind of question.

## 3. Who else is in the room

**Decided.** A Student sees their own team named and spaced out, and everyone else smaller
underneath.

```
┌─────────────────────────────────┐
│  YOUR TEAM                      │
│  Amira      Drone 1   ← you     │
│  Josh       Drone 3             │
│                                 │
│  EVERYONE ELSE                  │
│  Sara  Ben  Lily  Tom  Priya    │
│  Dan   Ollie  Nadia             │
└─────────────────────────────────┘
```

The Teacher keeps the full board: every child, which Drone they took, and when they joined.

## 4. Looking back, never forward

**Decided.** A Student can tap an earlier step and re-read it. They can never open a later
one.

**This amends ADR-0028**, which says the Student rail is look-only and nothing on it is
pressable. What changes is narrow and the reason is worth writing down: a child who cannot
re-read the rules will ask the Teacher instead, in the middle of a lesson, while holding a
drone. Looking back at what already happened is not navigation; it is memory.

**Two things must both be true while they are looking back:**

- A way to return to now, for when nothing else happens
- **The screen pulls itself back the moment something needs them.** A child re-reading step 2
  must not miss their takeoff clearance because their eyes were elsewhere. The Teacher's
  answer outranks whatever the child was reading.

## 5. A legend that names something not on screen

Carried from the last review, where the engineer correctly flagged it and left it out of scope.

At 390 on step 7, the Scope's key reads **"Hatched = No-fly Zone"** while the zone sits
outside the drawn window. The legend names a pattern that is not there.

Same family as the two defects fixed last wave: **the screen saying something that is not
true.**

## The prompt

```
Five items. Every decision is made; do not stop to ask. If you meet an
ambiguity genuinely not covered, choose whichever option puts FEWER WORDS on a
screen, record it in docs/DECISIONS.md, and continue.

COMMIT 1, BEFORE THE RAIL WORK

Amend ADR-0028. It says the Student rail is look-only and nothing on it is
pressable. A Student may now tap an EARLIER step and re-read it, and may never
open a later one. Write the reason down: a child who cannot re-read the rules
asks the Teacher instead, mid-lesson, while holding a drone. Looking back at
what already happened is memory, not navigation. Everything else in ADR-0028
stands.

1. THE ADDRESS DECIDES THE ROLE FOR THAT TAB.
   /mission is the Teacher, /student is the Student, for as long as that tab is
   open. The remembered role is used only to route someone opening the bare
   address. Today the stored role overrules the address, so every new tab
   inherits the last role picked and two tabs cannot hold two roles.
   The PIN gate does not move: a child typing /mission is still stopped there.
   The lock was never the hidden button.

2. THE WAY OUT APPEARS WHEN THE DRONE IS DOWN, OR WHEN THE BOARD HAS GONE
   QUIET. StudentMissionScreen:270 gives the exit only when not airborne. A
   tablet that last heard "airborne" seventeen hours ago still believes it, so
   a child sits on "Land and wait" with nothing to press, forever. Silence is
   not flight. Use the heartbeat that already exists.
   A child genuinely flying still gets no exit, which is correct.

3. WHO ELSE IS IN THE ROOM. The Student sees their own team named and spaced,
   and everyone else smaller underneath. The Teacher's board keeps the full
   list: every child, the Drone they took, and when they joined.

4. LOOKING BACK. A Student may tap a completed step and re-read it. Later steps
   stay untappable. Two things must both hold:
     - a way to return to now, for when nothing else happens
     - the screen pulls itself back the moment something needs them. A child
       re-reading step 2 must not miss their takeoff clearance. The Teacher's
       answer outranks whatever the child was reading.

5. THE SCOPE'S LEGEND MUST NOT NAME WHAT IS NOT DRAWN. At 390 on step 7 the key
   reads "Hatched = No-fly Zone" while the zone sits outside the window. Same
   family as the defects fixed last wave: the screen saying something untrue.

PROVE IT BY RUNNING IT
  - Open /mission and /student in two tabs of the same browser and confirm both
    hold their role at once.
  - Put a Student on a Drone, let the board go quiet, and confirm the way out
    appears rather than trapping them.
  - Tap back to step 2 as a Student, then grant that Student's takeoff from the
    Teacher tab, and confirm the screen returns to now by itself.
Shoot at 390, 820, 1180 and 1280, both themes, both roles.

Gate is npm test and npm run typecheck.
```
