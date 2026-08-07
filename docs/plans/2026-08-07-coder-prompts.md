# Prompts for the next four waves, 2026-08-07

Copy-paste, one wave per branch. Written after the rail shipped, the front end review came
back, and the Student half was designed. Context lives in
[where everything stands](./2026-08-07-where-everything-stands.md).

Reference material both terminals need:

- Teacher prototype: <https://claude.ai/code/artifact/a17e27e0-b6d8-44da-a424-95066847314c>
  (local copy: `C:\Users\reyse\.claude\projects\D--techtechflight\798f3153-721a-405e-a230-a6ce1b59e6bb\tool-results\artifact-a17e27e0-1785837251-fb81.html`)
- Student prototype: <https://claude.ai/code/artifact/23c6abed-f2ae-456a-bfb0-a01e63274e93>

## Wave 1, coder. Before anyone is shown the board.

```
Three fixes on main. One branch, one PR. Nothing here is optional; each one is a
dead end a Teacher can walk into during a lesson.

1. Step 11 must refuse, not disappear.
   mission-flow.ts:264 closes step 11 while anything is airborne, so StepSurface
   never mounts and a Teacher gets one line of text with nothing to press.
   ADR-0026 says the refusal IS the step. Open the step, render the craft list
   with Recall and Land the way the prototype does, and let the Confirm button
   be the thing that refuses, with the reason in words.

2. /reports must always land somewhere.
   reports/page.tsx:11 forwards to /mission?step=12, which is gated on
   facts.sealed. With nothing sealed there is no route to the weekly digest,
   the export, or past Lessons. Either open step 12 read-only when nothing is
   sealed, or keep the standing report screen behind /reports the way ADR-0026
   says it does.

3. The Warm-up must never cover a running Mission.
   LessonScreen.tsx:239 gates it on sessionStorage, so a new tab or a restarted
   browser replays a 60-second full-screen overlay over a live board.

Also delete the dead `carried` assignment at ControlScreen.tsx:445-452. It does
nothing, and it sits under a comment describing a bug it does not cause. It
already misled one reviewer into a stop-the-line call.

NOT IN SCOPE: the "grant never reaches the tablet" finding. It is wrong.
grantSeatsForDrone reaches writeClassroomSession through grantSeatClearance and
updateSeatPhase, which writes localStorage, broadcasts, and pushes to the cloud.

Gate is npm test and npm run typecheck. Screenshot before claiming a visual fix:
build, then scripts/shot.mjs <label> <route> <width> from PowerShell.
```

## Wave 2, coder. What the owner saw, plus the review leftovers.

```
Two groups on one branch. Group A is what the product owner found looking at
the running board. Group B is polish the front end review raised.

GROUP A, the owner's findings. All four verified in code.

1. The lesson name is asked twice on one page.
   LessonPrepPanel.tsx:55 says "Lesson name" with a Save plan button.
   LessonScreen.tsx:204 says "What is this lesson?" with Start the lesson.
   Same question, two boxes, one screen. Keep one. If a saved plan genuinely
   needs its own name, say so in DECISIONS.md and make the two read as
   obviously different things; otherwise delete one.

2. There is no way back after Start.
   LessonScreen swaps to LessonUnderWay and the Mission set-up is gone. A
   Teacher who mis-set something has no route back. Give them one.

3. Remove the Mission Zone.
   ZoneKind in web/lib/airspace.ts is 'mission' | 'no-fly'. Drop 'mission'.
   Teachers draw No-fly Zones only, any number, which the type already allows.
   The net cage already does what the blue polygon was doing.
   Knock-ons you must handle: the success criterion "no zone breach" becomes
   "no no-fly breach", and step 3 can no longer be locked behind "Draw the
   Mission Zone first". Pick a new lock reason that is true.
   This needs an ADR. ADR-0019 argued zones live in the Fleet's local frame and
   that argument still holds for no-fly zones; what changes is that the go-area
   is no longer drawn.

4. Add a starting point, one per drone.
   Nothing sets one today even though Recall says "return to the launch point".
   Home is where the drone was standing when it left the ground. Six craft
   recalled to one square metre collide, so it must be per drone, never one for
   the class. No marker, no camera, no detection: telemetry already has the
   position.

GROUP B, from the review.

5. MissionRunScreen.tsx:117 passes selectedCraftName: null, so step 8's done
   string can only ever read "No craft selected". StepRail.test.tsx:100 asserts
   'Kestrel', a state the app cannot reach. Wire the real selection through and
   fix the test to match reality.

6. The rail argues with itself: a tick beside "No teams yet". missionCraftIds
   (mission-flow-facts.ts:47-56) falls back to mission.droneIds when teams are
   empty, so teamOnCraft is true while summary.teams is 0.

7. ControlScreen.tsx:181 calls scrollIntoView on mount, which moves the
   sequential-focus starting point. On step 7 the rail is not reachable in 40
   tab presses. Fix the focus start, do not remove the scroll.

8. ClearanceQueue.tsx:146 reads "Grant clearance". The prototype reads
   "Grant takeoff".

9. Two layout invariants have no stylesheet assertion, so deleting a CSS rule
   ships a broken panel with every test green. Add them to SiteNav.test.tsx and
   MissionRunScreen.test.tsx. StepRail.test.tsx:245-262 shows the pattern.

10. globals.css:917 has the only raw colour literal in a component rule, the
    scrim. Give it a token.

Gate is npm test and npm run typecheck. Screenshots for anything visual.
```

## Wave 3, coder. The Student half.

```
The Student app has twelve screens and only five can be reached. This wave
makes the other seven reachable and builds them to the prototype.

Prototype, and its copy is the spec:
  https://claude.ai/code/artifact/23c6abed-f2ae-456a-bfb0-a01e63274e93

COMMIT 1, BEFORE ANY COMPONENT WORK

ADR-0025 says the Student chrome carries no phase counter. The product owner
has decided the Student tablet gets a rail showing all twelve steps, look-only
and never tappable. Amend ADR-0025 and the CLAUDE.md gotcha first, the same way
ADR-0026 reversed ADR-0024 this morning. Do not implement around it, and do not
argue the old position: it has been ruled on.

Everything else in ADR-0025 stands and is not up for discussion: exactly two
pressable things in the whole Student app, landscape and full width, one
dominant thing at a time, phases derived from records and Telemetry and never
from a press, and an absent reading printed in words.

THE HOLE TO FILL

classroom-session.ts sets checkpointIndex to 0 at line 283 and nothing ever
increments it. Nothing ever sets the 'returning' or 'complete' phases. So a
Student takes off and their tablet stops changing for the rest of the lesson.

THE RULE, and it is the same for all three Scenarios

1. Every Scenario becomes points on the map. Search and Rescue has the search
   area and the target; Delivery has the drop pads; Building Inspection has the
   faces of the building.
2. A point ticks off by itself when the drone's position proves it reached it.
   ANY ORDER. Nobody presses anything.
3. When every point is reached, the Teacher's board offers Approve. It must not
   be able to appear before that, so a Teacher cannot approve a team that did
   not fly it.
4. The Teacher taps once. Students still have exactly two buttons.
5. 'returning' follows the Teacher's approval; 'complete' follows the drone
   being down. Both from records and Telemetry, never a press.

ALSO IN THIS WAVE

6. The Student poster's "What if something happens" table has four rows and the
   app answers none of them: low battery, obstacle ahead, new target, missed
   checkpoint. The app prints the battery number and never says what to do.
   Give each one an answer on the Student screen, in the poster's own words.

7. incident-playbook.ts carries eight entries and the Emergency poster lists
   six incidents. "Missed Target / Route Error" has no entry. Add it.

8. Build the twelve screens to the prototype: the look-only rail, one dominant
   thing per screen, "3 left" leading the flying screen with a small map under
   it and battery and time small, warnings taking over the whole screen, and
   Held as its own screen rather than a variant of waiting.

DETECTION, for Search and Rescue only

mission-scenarios.ts already carries usesDetection: true on Search and Rescue
alone. If you wire anything: the AI suggests and the Teacher confirms, never
the AI alone. "person" must not be the trigger, because a classroom is full of
children and YOLO detects people better than anything else. With the model files
missing the fallback detector draws two confident invented boxes, so a naive
wiring reports targets that are not there. If in doubt, leave detection out of
this wave and let the Teacher tap.

Gate is npm test and npm run typecheck. Screenshot the Student screens in
landscape at tablet widths, both themes, before claiming they work.
```

## The front end reviewer

```
You are the front end reviewer on TechTech Flight. You comment. You never
commit and you never push.

WHAT YOU ARE REVIEWING AGAINST

Teacher prototype:
  https://claude.ai/code/artifact/a17e27e0-b6d8-44da-a424-95066847314c
Student prototype:
  https://claude.ai/code/artifact/23c6abed-f2ae-456a-bfb0-a01e63274e93
Read CLAUDE.md, docs/DESIGN-TOKENS.md, design.md and
docs/DELIBERATE-POSITIONS.md before forming an opinion. Read
docs/plans/2026-08-07-where-everything-stands.md for what was decided and why.

Two audiences. A Teacher standing in front of a class who glances at a laptop,
and a ten year old holding a tablet in two hands while flying a real aircraft.
Neither one studies the screen.

LOOK AT PICTURES, NOT AT TESTS

The suite is jsdom, so a broken flex axis, a wrong aspect ratio and an
off-screen rail all pass green. Build with NEXT_PUBLIC_DEMO_ONLY=1, then
scripts/shot.mjs <label> <route> <width> from PowerShell. Shoot 1280, 1024 and
a tablet width, both themes. TTF_SHOT_ROLE seeds the role: without it you are
photographing the door, which is what happened to every Teacher screenshot
taken before 2026-08-07.

CHECK

1. Every dead end. Can a Teacher reach a step, a route or a button and find
   nothing to press. That class of defect is what this whole wave exists to
   remove, and step 11 and /reports were both examples.
2. One navigation only. If the seven-item nav and the twelve-step rail are both
   on screen competing, that is the defect the rail exists to remove.
3. Locked steps say why, in the prototype's own words, never "unavailable".
4. Steps 7 to 10 read live, never ticked.
5. The Student app has exactly two pressable things: Ask to take off, and
   Understood. A third is a stop-the-line finding.
6. No press advances a Student's own screen. Trace every phase change back to a
   record or to Telemetry.
7. No invented readings. A figure the Fleet is not sending is absent in words,
   never a zero and never a dash.
8. Tokens only: bg-canvas, text-ink-subtle, border-hairline. Any raw hex or px
   font-size is a defect (ADR-0008). Grep for both.
9. No em dashes and no middots in on-screen copy. The prototypes contain
   middots; the product deliberately does not. Do not grade the copy character
   for character against the prototype, only word for word.
10. Keyboard. Both rails are navigation and must be reachable and visibly
    focused without a mouse.
11. Dark theme and print.

BEFORE YOU CALL SOMETHING STOP-THE-LINE

Follow the call chain to the end. On 2026-08-07 a review reported that a
Teacher's grant never reaches the Student tablet, because ControlScreen builds
a `carried` value and discards it. The write happens two calls deeper, inside
updateSeatPhase. The finding was wrong and it was reported as verified. Read
every function in the path before you claim an effect does not land.

DO NOT RAISE

docs/DELIBERATE-POSITIONS.md lists six things that look like bugs and are not.
The existence of either rail: both have been ruled on by the owner. Em dashes
in JSDoc.

HOW TO REPORT

Run /code-review for the standards and spec pass, then add your visual findings
with screenshots. Severity first. For each finding: what you saw, which file and
line, what it should be instead, and whether it is a defect or a matter of
taste. Say which ones you verified by running the code and which you read.
```
