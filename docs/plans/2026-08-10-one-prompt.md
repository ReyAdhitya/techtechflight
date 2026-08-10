# One prompt: the review fixes, switching classrooms, and the air in order

Everything outstanding on 2026-08-10, combined. Eleven items from two plans plus a review.

Sources:
[the review](./2026-08-10-review-of-the-twenty-one.md) ·
[classrooms and the air](./2026-08-10-classrooms-and-the-air.md)

---

```
You are the engineer on TechTech Flight. Repo: D:\techtechflight, branch main.

Read first: CLAUDE.md, CONTEXT.md, docs/DELIBERATE-POSITIONS.md, and the two
plans this comes from:
  docs/plans/2026-08-10-review-of-the-twenty-one.md
  docs/plans/2026-08-10-classrooms-and-the-air.md

Eleven items. Do all of them. DO NOT STOP TO ASK QUESTIONS: every decision has
been made by the owner and is written below. If you meet an ambiguity genuinely
not covered, choose whichever option puts FEWER WORDS on a Teacher's or a
Student's screen, record it in docs/DECISIONS.md, and continue.

Prototypes, whose copy is the spec word for word but not character for
character, because they carry middots and the product deliberately does not:
  Teacher: https://claude.ai/code/artifact/a17e27e0-b6d8-44da-a424-95066847314c
  Student: https://claude.ai/code/artifact/23c6abed-f2ae-456a-bfb0-a01e63274e93

════════════════════════════════════════════════════
FIRST. TWO DEFECTS FOUND BY RUNNING THE PRODUCT.
Small, urgent, and independent of everything else. Do these before the ADR.
════════════════════════════════════════════════════

1. THE DEMO'S ONE RECALL FLIES TO THE WRONG PLACE.
   takeOff in fleet-core/src/simulator/simulated-telemetry-source.ts stamps
   drone.homeEastM and drone.homeNorthM from the CURRENT position
   unconditionally, and re-randomises targetAltitudeM in the same breath.
   flyRoute calls takeOff with no airborne guard, and DemoMissionDirector calls
   flyRoute on an aircraft it has already filtered as airborne.

   Measured result: after the scripted incident, a Recall lands 8.5 m from the
   launch point, while the Scope's dotted line still points at the bench,
   because HomePointTracker uses the last grounded frame. The line on screen and
   the aircraft's destination disagree, and nothing says so.

   Gate the home stamp on !drone.airborne, and the altitude re-randomisation the
   same way; or have flyRoute skip the take-off when already airborne. Pin it
   with a test that flies a route on an airborne Drone and asserts home did not
   move.

   This is the ninety seconds the demo exists for, and the bug sits directly
   under the comment explaining why home matters. Fix it first.

2. THE STUDENT SCREEN SCROLLS SIDEWAYS ON A PHONE.
   At 390 and 360, documentElement.scrollWidth is 1246 against a 390 viewport,
   and a child can swipe the screen 856px into blank space.

   Cause, pinned in the live page rather than guessed: .sr-only computes to
   position: absolute, and the rail's scrolling <ol> is position: static, so the
   screen-reader text positions against a further ancestor and escapes the
   overflow-x clip. Hiding the sr-only spans drops scrollWidth to 390; setting
   position: relative on the <ol> also drops it to 390.

   Add `relative` to that <ol>. Then sweep for the same pattern anywhere else:
   any scroll container holding sr-only text with no positioning context has
   this bug. jsdom cannot see it, so pin it with a stylesheet assertion, not a
   render test.

   Note for the record: the accessibility text ADR-0004 requires is what breaks
   the phone layout. Both rules are right; their interaction is the bug.

════════════════════════════════════════════════════
THEN. THE DECISION RECORD, BEFORE ANY WORK ON THE AIR.
════════════════════════════════════════════════════

3. WRITE THE ADR THAT REVERSES PART OF ADR-0026, and amend the CLAUDE.md
   gotchas in the same commit.

   ADR-0026 says steps 6 to 10 are one live board and are not gated. The owner
   has decided each of those steps shows only its own panel, in order, like
   steps 1 to 5.

   ADR-0026's safety argument is ANSWERED, not ignored: the Attention bar and
   the fleet-wide Land all / Hover all / Stop all stay on screen at EVERY step,
   so a Teacher can stop every aircraft from anywhere in one tap.

   Write the cost down honestly rather than glossing it: per-Drone commands on
   the strips now live on their own step, so landing ONE Drone is one rail tap
   away rather than zero. The strip anatomy rule in CLAUDE.md must be amended to
   say this, not quietly broken.

   Do not implement around this and do not argue the old position. It has been
   ruled on.

════════════════════════════════════════════════════
A. A TABLET CAN LEAVE A CLASSROOM.
The owner opened the Student app on an iPhone and found it sitting in a lesson
called "bleble" that had long finished, with no way out.
════════════════════════════════════════════════════

4. A NEW CODE EVERY LESSON. openClassroom reads
   `input.code ?? existing?.code ?? mintClassroomCode(now)`, so once a code
   exists it is reused forever and last week's code still opens today's class.
   A new Lesson mints a new code; the old one stops working. This is what makes
   an old session provably dead rather than merely stale.

5. A TABLET CAN LEAVE, BOTH WAYS.
   Automatically, when the Lesson ends or the code dies: the tablet returns to
   the join screen and says why, in words.
   By hand, a visible way out, for when the automatic path never fires. This is
   the case that stranded the owner: a session that simply stopped being used
   and never ended, so nothing would ever have told that iPhone to leave.

   ADR-0025's two-press rule is NOT violated. Joining is not one of the two
   Mission presses and neither is leaving; the reasoning is already written in
   WhichDroneAreYouHolding. There is no leaveClassroom, clearClassroom or
   anything like it anywhere in the codebase today.

6. A LESSON ENDING MID-FLIGHT DOES NOT MAKE THE SCREEN VANISH. It reads "The
   lesson has ended. Land now." and returns to the join screen once Telemetry
   sees the Drone down. Never take a screen away from a child holding a flying
   aircraft.

7. A STALE SESSION MUST SAY SO. Today a tablet on a dead session reads "Your
   Teacher has not put any Drones in this lesson yet. Wait, and they will
   appear." That is a lie: nothing will ever appear. Name what is actually
   true, that the lesson has ended.

════════════════════════════════════════════════════
B. THE AIR IN ORDER.
════════════════════════════════════════════════════

8. STEPS 6 TO 10 EACH SHOW ONLY THEIR OWN PANEL, in the rail's order:
   6 clearance, 7 where everything is, 8 telemetry and camera, 9 commands,
   10 alerts.

   ControlScreen today is one page of nine sections scrolled into by ref, and
   the page order runs 10, 6, 9, 7. Tapping step 7 scrolls PAST steps 9 and 10
   to reach it, and tapping step 9 goes backwards. The numbers count up and the
   page does not, which is the whole of the "messy" feeling the owner reported.

9. THE ATTENTION BAR AND THE FLEET-WIDE BUTTONS ARE ON EVERY STEP. Land all,
   Hover all, Stop all. They never move, never scroll away, and are never gated
   on selection.

════════════════════════════════════════════════════
C. THE REVIEW'S REMAINING ITEMS.
════════════════════════════════════════════════════

10. THE TYPE-SCALE TEST DOES NOT CATCH WHAT IT CLAIMS.
    web/type-scale.test.ts:27 accepts only full.endsWith('.tsx'), so every
    text-* in a .ts file is unchecked, and arbitrary values pass:
    showcase/DroneCard.tsx text-[1.375rem], ConnectionStrip.tsx
    text-[0.9375rem]. These are the same two gaps reported in the previous wave
    and still unchanged. Widen it to .ts, refuse arbitrary values, and fix the
    two files it then catches.

    Also taste, same screen: the two status cards on the Student screen wrap to
    one word per line at 390. Give them room or let them stack.

11. THE REVIEW HAS A HOLE AND IT IS NOT THE REVIEWER'S FAULT.
    The Standards axis stalled with no output, so px font-sizes, raw colour
    literals, the PIN's storage model and the 200-Drone limit were never checked
    by anyone. Run those four checks yourself and report what you find. A
    missing pass reads exactly like a clean one, which is how defects survive.

════════════════════════════════════════════════════

KEEP ALL THREE DEPARTURES the last review flagged. These are the owner's
rulings, not oversights:
  - ClassroomFleetSizePanel, the Settings number for Fleet size. Unlimited is
    meaningless without a way to add.
  - no-fly-alert.ts as a general breach-Alert fix rather than demo-only. A
    breach raising no Alert was never a demo problem.
  - RoleGate sending Teachers to /mission rather than /lesson. /mission is the
    spine since ADR-0026.

RULES THAT DO NOT BEND
- Students never get a Command. Land, Hover, Recall, Auto-land and Stop belong
  to the Teacher, always. ADR-0011 and ADR-0021.
- Exactly two pressable things in the Student app during a Mission: Ask to take
  off, and Understood. Phases come from records and Telemetry, never a press.
- No GPS, no map tile. Metres from the Fleet's own origin, ADR-0019.
- No invented readings. Absent is said in words, never a zero, never a dash.
- No em dashes and no middots in on-screen copy. Rewrite the sentence.
- Semantic tokens only. A px font-size is a defect, ADR-0008.

PROVE IT BY RUNNING IT, NOT BY READING IT
Three rounds now, and every serious defect was found by using the product while
a green suite of 1,620 tests said nothing. So:
  - Fly the demo end to end and Recall after the incident. Item 1 is not done
    until the aircraft lands where the dotted line says.
  - Open the Student app at 390 and 360 and confirm scrollWidth equals the
    viewport. Item 2 is not done until it does.
  - Start a Lesson, join a Student on a second device, end the Lesson while
    that Drone is flying, and watch the tablet. Then start a new Lesson and
    confirm the old code no longer works.
  - Walk steps 6 to 10 in order and confirm each shows its own thing with the
    emergency bar above it.
Shoot every screen at 390, 820, 1180 and 1280, both themes, both roles.

HOW TO WORK
Own worktree, one branch, conventional commits, one logical change each.
Rebase, do not squash. Update docs/CHANGELOG.md and docs/DECISIONS.md and add
anything non-obvious to the CLAUDE.md Gotchas. Gate is npm test and npm run
typecheck; there is no lint. Open one PR at the end saying which of the eleven
are done and which, if any, you consciously left and why.
```
