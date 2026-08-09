# One prompt, all twenty five fixes

For a coder terminal that must finish without asking the owner anything. Every decision
that would normally be a question has been made in advance and is written into the prompt.

Line numbers are as of `18665fd` and will drift as the work lands. Trust the described
behaviour over the number.

Companion: [the plan, wave by wave](https://claude.ai/code/artifact/4e324c87-6707-4767-ab16-2b79509cc5a0)

---

```
You are the engineer on TechTech Flight, a ground station board a school teacher
uses to run a class of drones. Repo: D:\techtechflight, branch main at 18665fd.

Read first, in this order: CLAUDE.md, CONTEXT.md, docs/DESIGN.md, design.md,
docs/DELIBERATE-POSITIONS.md, docs/plans/2026-08-07-where-everything-stands.md.

There are twenty five fixes below. Do all of them. Do not stop to ask questions:
every decision that would need the owner has already been made and is written
into this prompt. If you hit an ambiguity that is genuinely not covered, choose
the option that puts FEWER WORDS on a Teacher's or a Student's screen, record the
call in docs/DECISIONS.md, and keep going.

THE TWO PROTOTYPES ARE THE SPEC

Teacher, already built and live:
  https://claude.ai/code/artifact/a17e27e0-b6d8-44da-a424-95066847314c
  local copy, read this rather than refetching:
  C:\Users\reyse\.claude\projects\D--techtechflight\798f3153-721a-405e-a230-a6ce1b59e6bb\tool-results\artifact-a17e27e0-1785837251-fb81.html

Student, to be built in group D:
  https://claude.ai/code/artifact/23c6abed-f2ae-456a-bfb0-a01e63274e93

Their copy is the spec, word for word but NOT character for character: both
prototypes contain middots and the product deliberately has none. Take the words,
drop the middots, rewrite the sentence rather than deleting the character.

DECISIONS ALREADY MADE, DO NOT REOPEN ANY OF THESE

1. The word is "Drone", not "craft". CONTEXT.md is the authority. The build
   currently uses "craft" 22 times in Teacher-facing copy. Change them.
2. A drone's home is AUTOMATIC: wherever it was standing when it left the ground.
   No Teacher input, no marker, no camera, no detection.
3. /reports keeps a standing report screen of its own. It must never forward to a
   step that can be locked.
4. The lesson name is asked ONCE, in the set-up area, labelled "Lesson name". The
   same value names the saved plan and names the started Lesson.
5. The Student rail shows all twelve steps and is NEVER tappable.
6. Checkpoints are reached in ANY order.
7. The Teacher approves a finished task. Students never get a third button.
8. Issue #623, icons only and removing Large format, is OUT OF SCOPE. Do not
   touch the header controls.

RULES THAT DO NOT BEND

- Students never get a Command. Land, Hover, Recall, Auto-land and Stop belong to
  the Teacher, always. ADR-0011 and ADR-0021.
- Phases come from records and Telemetry, never from a button press.
- No GPS and no map tile. Position is metres from the Fleet's own origin, ADR-0019.
- No invented readings. An absent value is said in words, never a zero and never a
  dash dressed up as live.
- No em dashes and no middots in anything a Teacher or a Student reads. Commit
  898af04 broke a build doing this carelessly; read 898af04, 541c9be and dfebeb3
  before touching copy.
- Semantic colour tokens only: bg-canvas, text-ink-subtle, border-hairline. Never
  the shadcn base layer. A px font-size is a defect, ADR-0008.
- Exactly two pressable things in the whole Student app: Ask to take off, and
  Understood.

COMMIT ORDER. The two ADRs come first, before any component work, because
CLAUDE.md currently forbids two of the things below and you will otherwise argue
with yourself.

──────────────────────────────────────────────────────────────────────
GROUP A. The two decision records. Commits 1 and 2.
──────────────────────────────────────────────────────────────────────

1. ADR: the go-area is no longer drawn.
   ZoneKind in web/lib/airspace.ts is 'mission' | 'no-fly'. Drop 'mission'
   entirely. Teachers draw No-fly Zones only, any number, which the type already
   allows. The flying area is a physical net cage, so a blue polygon on the map
   told a Teacher something they could already see. ADR-0019's local-frame
   argument still holds for no-fly zones and is not being reopened; what changes
   is that the go-area is no longer drawn at all.

2. ADR: the Student rail. Amend ADR-0025, which says the Student chrome carries
   no phase counter. The owner has decided the Student tablet gets a rail showing
   all twelve steps, look-only and never tappable, because a Student never chooses
   what happens next and a tappable rail would be twelve rows they can look at and
   never use. Update the CLAUDE.md gotcha in the same commit. Everything else in
   ADR-0025 stands: two pressable things, landscape and full width, one dominant
   thing at a time, phases from records and Telemetry, absent readings in words.

──────────────────────────────────────────────────────────────────────
GROUP B. Dead ends a Teacher can walk into mid-lesson. Highest severity.
──────────────────────────────────────────────────────────────────────

3. Step 11 must refuse, not disappear.
   mission-flow.ts:264 closes step 11 while anything is airborne, so StepSurface
   never mounts and a Teacher gets one line of text with nothing to press.
   ADR-0026 says the refusal IS the step. Open the step, render the Drone list
   with Recall and Land the way the prototype does, and let the Confirm button be
   the thing that refuses, with the reason in words.

4. /reports must always land somewhere.
   reports/page.tsx:11 forwards to /mission?step=12, gated on facts.sealed. With
   nothing sealed there is no route to the weekly digest, the export or past
   Lessons. Restore the standing report screen behind /reports, per decision 3
   above and per ADR-0026's own wording.

5. The Warm-up must never cover a running Mission.
   LessonScreen.tsx:239 gates it on sessionStorage, so a new tab or a restarted
   browser replays a sixty second full-screen overlay over a live board.

6. Delete the dead `carried` assignment at ControlScreen.tsx:445-452.
   It does nothing, and it sits under a comment describing a bug it does not
   cause. It already misled a reviewer into a stop-the-line call.
   FOR THE RECORD, so you do not chase it: the Teacher's grant DOES reach the
   tablet. grantSeatsForDrone → grantSeatClearance → updateSeatPhase →
   writeClassroomSession, which writes localStorage, broadcasts, and pushes to the
   cloud. Do not "fix" a bug that is not there.

──────────────────────────────────────────────────────────────────────
GROUP C. What the owner found looking at the running board.
──────────────────────────────────────────────────────────────────────

7. One lesson name, not two.
   LessonPrepPanel.tsx:55 asks "Lesson name" with a Save plan button.
   LessonScreen.tsx:204 asks "What is this lesson?" with Start the lesson. Same
   question, two boxes, one screen. Keep one field labelled "Lesson name", used by
   both Save plan and Start the lesson.

8. A route back after Start.
   LessonScreen swaps to LessonUnderWay and the Mission set-up is gone, so a
   Teacher who mis-set something is stuck. Give them a way back to set-up while a
   Lesson is under way.

9. Remove the Mission Zone, per the ADR you wrote in commit 1.
   Knock-ons you must handle: the success criterion "no zone breach" becomes
   "no no-fly breach", and step 3 can no longer be locked behind "Draw the Mission
   Zone first". Choose a lock reason that is true and keep it in the prototype's
   register.

10. A starting point, one per Drone.
    Nothing sets one today, even though Recall says "return to the launch point".
    Home is where the Drone was standing when it left the ground, taken from
    Telemetry. It must be per Drone and never one for the class: six craft
    recalled to one square metre collide.

──────────────────────────────────────────────────────────────────────
GROUP D. The Student app. The largest group.
──────────────────────────────────────────────────────────────────────

Today a Student takes off and their tablet never changes again.
classroom-session.ts sets checkpointIndex to 0 and nothing increments it. Nothing
ever sets the 'returning' or 'complete' phases. Twelve screens exist and five can
be reached.

11. Points tick off by themselves.
    A point is reached when the Drone's own position proves it. Any order. Nobody
    presses anything, so nobody can claim a point they did not fly to.

12. The Teacher's Approve.
    When every point is reached, the Teacher's board offers Approve. It must be
    impossible for that button to appear earlier, so a Teacher cannot approve a
    team that did not fly it. One tap.

13. 'returning' follows the Teacher's approval. 'complete' follows the Drone being
    down. Both from records and Telemetry, never from a press.

14. The four situations the Student poster names, which the app answers for none
    of: low battery, obstacle ahead, new target, missed checkpoint. The app prints
    the battery number and never says what to do about it. Give each one an answer
    on the Student screen, in the poster's own words.

15. incident-playbook.ts carries eight entries. The Emergency poster lists six
    incidents and "Missed Target / Route Error" has no entry. Add it.

16. Build the twelve Student screens to the prototype: the look-only rail, one
    dominant thing per screen, "3 left" leading the flying screen with a small map
    under it and battery and time small at the bottom, warnings taking over the
    whole screen, and Held as its own screen rather than a variant of waiting.

DETECTION, and the safe default is to leave it out.
mission-scenarios.ts already carries usesDetection: true on Search and Rescue
alone. If you wire anything at all: the AI suggests and the Teacher confirms,
never the AI alone, and "person" must not be the trigger, because a classroom is
full of children and YOLO detects people better than anything else. With the model
files missing, the fallback detector draws two confident invented boxes, so a
naive wiring reports targets that do not exist. Leaving detection out of this pass
is an acceptable outcome; wiring it wrong is not.

──────────────────────────────────────────────────────────────────────
GROUP E. The front end review's remaining findings.
──────────────────────────────────────────────────────────────────────

17. MissionRunScreen.tsx:117 passes selectedCraftName: null, so step 8's done
    string can only ever read "No craft selected". StepRail.test.tsx:100 asserts
    'Kestrel', a state the app cannot reach. Wire the real selection through and
    make the test match reality.

18. The rail argues with itself: a tick beside "No teams yet". missionCraftIds
    (mission-flow-facts.ts:47-56) falls back to mission.droneIds when teams are
    empty, so teamOnCraft is true while the summary reads zero teams.

19. ControlScreen.tsx:181 calls scrollIntoView on mount, which moves the
    sequential-focus starting point. On step 7 the rail is not reachable in forty
    tab presses. Fix the focus start; do not remove the scroll.

20. ClearanceQueue.tsx:146 reads "Grant clearance". The prototype reads
    "Grant takeoff".

21. Two layout invariants have no stylesheet assertion, so deleting a CSS rule
    ships a broken panel with every test green. Add them to SiteNav.test.tsx and
    MissionRunScreen.test.tsx. StepRail.test.tsx:245-262 shows the pattern.

22. globals.css:917 holds the only raw colour literal in a component rule, the
    scrim. Give it a token.

──────────────────────────────────────────────────────────────────────
GROUP F. The backlog that predates all of this.
──────────────────────────────────────────────────────────────────────

23. `text-caption` is a class with no rule. globals.css defines nothing for it and
    twenty component files set it. Add the token, taking the size from
    docs/DESIGN-TOKENS.md and not from taste. Was issue #649.

24. FleetHeadcountCheck.tsx is still on the Fleet screen and two non-test files
    import it. The owner asked for it gone in issue #624. Delete the component,
    its tests, and fleet-headcount.ts if nothing else reads it.

25. ControlCameraSlide.test.tsx "dismisses the popup on Escape" is flaky: it
    passes alone and fails inside the suite. Fix it properly rather than skipping
    it.

KNOWN AND NOT YOURS TO FIX IN THIS PASS: a saved theme does not survive
hydration, and React error #418 fires on every role-gated route because RoleGate
reads localStorage during render. Both predate this work. Leave them, and do not
let them creep into scope.

──────────────────────────────────────────────────────────────────────
HOW TO WORK
──────────────────────────────────────────────────────────────────────

Own git worktree. One branch. Conventional commits, one logical change each: if
the subject needs the word "and", it is two commits. Rebase rather than squash.
Update docs/CHANGELOG.md and docs/DECISIONS.md before you finish, and add anything
non-obvious to the CLAUDE.md Gotchas.

THE GATE is npm test and npm run typecheck. That pair is the whole of CI; there is
no lint.

jsdom cannot see layout, so a broken rail, a wrong aspect ratio and an off-screen
panel all pass green. Before claiming any visual fix works: build with
NEXT_PUBLIC_DEMO_ONLY=1, then run scripts/shot.mjs <label> <route> <width> from
PowerShell, not Git Bash, and look at the image. TTF_SHOT_ROLE seeds the board
role; without it you are photographing the door. Shoot 1280, 1024 and a tablet
width, in both themes, and shoot the Student screens in landscape.

Windows: next build fails with EBUSY if any shell has web/out as its working
directory.

Open one PR when the whole list is done, with a summary of which of the twenty
five are complete and which, if any, you consciously left and why.
```
