# Switching classrooms, and putting the air in order

Decided with the product owner on 2026-08-10, after they opened the deployed Student app on
an iPhone and found it still sitting in a lesson called "bleble" that had long finished.

Two subjects: a device that cannot leave a classroom, and the **In the air** steps being one
long scrolling page whose order does not match the rail beside it.

## 1. The tablet is stuck in a dead lesson

Three symptoms, one story, all three traced in the code.

| What the owner saw | Cause |
|---|---|
| Still in the old class, "bleble" | **There is no way to leave a classroom.** No `leaveClassroom`, no `clearClassroom`, nothing anywhere. Once joined, joined forever |
| The classroom code never changes | `openClassroom` reads `input.code ?? existing?.code ?? mintClassroomCode(now)`. **Once a code exists it is reused for every lesson after it** |
| "Your Teacher has not put any Drones in this lesson yet" | `droneGrid(session)` reads the session, and that session is the stale one. It was written before any Drones existed and nothing refreshes it |

The tablet is holding a session from a lesson that is over, and has no exit.

### Decided

**A new classroom code every lesson.** Last week's code stops working, which is what makes an
old session provably dead instead of merely stale. Without this a tablet can never tell
today's lesson from last month's, which is exactly what happened.

**A tablet can leave, both ways.**

- **Automatically**, when the lesson ends or the code dies: the tablet returns to the join
  screen and says why.
- **By hand**, a visible way out for when the automatic path never fires. Automatic alone
  would not have rescued the owner today: the "bleble" session never ended, so nothing would
  ever have told that iPhone to leave.

**For the coder, so this is not refused:** ADR-0025 allows exactly two pressable things in the
Student app. A way out is not one of them, in the same way joining is not. The code already
makes this argument in `WhichDroneAreYouHolding`: joining happens before the Mission, so it is
not a Mission press. Leaving sits in the same category.

**If a lesson ends while a child is flying**, the tablet does not vanish. It says
**"The lesson has ended. Land now."** and returns to the join screen once the Drone is down.

> Never take a screen away from a child holding a flying aircraft. Waiting silently is safe
> but leaves them not knowing why nothing is happening; the instruction is the point.

## 2. The air is in the wrong order

**The rail promises an order the page does not have.**

```
THE RAIL SAYS              THE PAGE ACTUALLY IS
6  Takeoff clearance       Attention        ← step 10
7  Where everything is     Clearance        ← step 6
8  Telemetry and camera    Commands         ← step 9
9  Commands                Scope            ← step 7
10 Alerts                  Fleet actions
                           Target
                           Strips
                           Seal
```

`ControlScreen` is one long page of nine sections, and the rail scrolls into it by `ref`.
Tapping step 7 scrolls *past* steps 9 and 10 to reach it. Tapping step 9 goes backwards. The
numbers count up and the page does not, which is the whole of the "messy" feeling.

### Decided

**Steps 6 to 10 each show only their own panel, in order, exactly like steps 1 to 5.** No long
scrolling page.

**Two things never move and never disappear, on every step:**

```
┌────────────────────────────────────────────────┐
│  ⚠  Swift is close to a red zone    [Recall]   │ ← always
├────────────────────────────────────────────────┤
│  Land all      Hover all      Stop all         │ ← always
├──────────────┬─────────────────────────────────┤
│ 6 Clearance  │                                 │
│ 7 Where    ▸ │      one thing at a time        │
│ 8 Telemetry  │                                 │
│ 9 Commands   │                                 │
│ 10 Alerts    │                                 │
└──────────────┴─────────────────────────────────┘
```

### This reverses part of ADR-0026, and needs its own record

ADR-0026 says steps 6 to 10 are one live board and are **not** gated, on the grounds that a
Command a navigation press can hide is a Command a Teacher cannot reach in ten seconds. That
argument was right and is now answered differently: **the fleet-wide Land all, Hover all and
Stop all stay on screen at every step**, so a Teacher can stop every aircraft from anywhere in
one tap without the whole board being present.

**The honest cost, and it must be written into the ADR rather than glossed:** per-Drone
commands on the flight strips now live on their own step. A Teacher wanting to Land *one*
Drone is one rail tap away rather than zero. The fleet-wide stop covers the emergency; the
per-Drone case is a decision, not an oversight, and `CLAUDE.md`'s strip anatomy rule must be
amended to say so rather than quietly broken.

## The prompt

```
Two subjects. Every decision is made; do not stop to ask.

COMMIT 1, BEFORE ANY COMPONENT WORK

Write the ADR that reverses part of ADR-0026, and amend the CLAUDE.md gotchas
in the same commit. ADR-0026 says steps 6 to 10 are one live board and are not
gated. The owner has decided each of those steps shows only its own panel, in
order, like steps 1 to 5.

ADR-0026's safety argument is answered, not ignored: the Attention bar and the
fleet-wide Land all / Hover all / Stop all stay on screen at EVERY step, so a
Teacher can stop every aircraft from anywhere in one tap. Write the cost down
honestly: per-Drone commands on the strips now live on their own step, so
landing ONE Drone is one rail tap away rather than zero. The strip anatomy rule
in CLAUDE.md must be amended to say this, not quietly broken.

Do not implement around this and do not argue the old position. It has been
ruled on.

────────────────────────────────────────────
A. THE TABLET CAN LEAVE A CLASSROOM
────────────────────────────────────────────

1. A NEW CODE EVERY LESSON. openClassroom currently reads
   `input.code ?? existing?.code ?? mintClassroomCode(now)`, so once a code
   exists it is reused forever and last week's code still opens today's class.
   A new Lesson mints a new code. The old one stops working.

2. A TABLET CAN LEAVE, BOTH WAYS.
   Automatically: when the Lesson ends or the code dies, the tablet returns to
   the join screen and says why, in words.
   By hand: a visible way out, for when the automatic path never fires. This is
   the case that stranded the owner: a session that simply stopped being used
   and never ended.
   ADR-0025's two-press rule is not violated. Joining is not one of the two
   Mission presses and neither is leaving; the reasoning is already written in
   WhichDroneAreYouHolding.

3. A LESSON ENDING MID-FLIGHT does not make the screen vanish. It reads "The
   lesson has ended. Land now." and returns to the join screen once Telemetry
   sees the Drone down. Never take a screen away from a child holding a flying
   aircraft.

4. A STALE SESSION MUST SAY SO. Today a tablet holding a dead session shows
   "Your Teacher has not put any Drones in this lesson yet. Wait, and they will
   appear", which is a lie: nothing will ever appear. It must name what is
   actually true, that the lesson has ended.

────────────────────────────────────────────
B. THE AIR IN ORDER
────────────────────────────────────────────

5. STEPS 6 TO 10 EACH SHOW ONLY THEIR OWN PANEL, in the rail's order:
   6 clearance, 7 where everything is, 8 telemetry and camera, 9 commands,
   10 alerts. ControlScreen today is one page of nine sections scrolled into by
   ref, and the page order is 10, 6, 9, 7, which is why the numbers count up
   while the page does not.

6. THE ATTENTION BAR AND THE FLEET-WIDE BUTTONS ARE ON EVERY STEP. Land all,
   Hover all, Stop all. They never move, never scroll away, and are never
   gated on selection.

PROVE IT BY WALKING IT. Start a Lesson, join a Student on a second device, end
the Lesson while that Drone is flying, and watch the tablet. Then start a new
Lesson and check the old code no longer works. Then walk steps 6 to 10 in order
and confirm each one shows its own thing with the emergency bar above it.

Shoot every step at 390, 820, 1180 and 1280 in both themes. Gate is npm test
and npm run typecheck.
```

## Still open

- **The IN THE AIR panels themselves.** This plan fixes their order and their framing. Whether
  each panel is the right shape is a separate look, and worth taking once they are separated.
- Everything on the parked list from the earlier rounds, unchanged.
