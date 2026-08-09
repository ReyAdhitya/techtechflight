# Round two, both prompts

Everything decided on 2026-08-09 after the owner opened the deployed board on an iPad and an
iPhone, in two sittings. Twenty one changes across two plans, written as one coder prompt so
nothing has to come back as a question.

Sources:
[the eight from the tablet](./2026-08-09-the-eight-from-the-tablet.md) ·
[make the demo real](./2026-08-09-make-the-demo-real.md)

Reference:
Teacher prototype <https://claude.ai/code/artifact/a17e27e0-b6d8-44da-a424-95066847314c> ·
Student prototype <https://claude.ai/code/artifact/23c6abed-f2ae-456a-bfb0-a01e63274e93>

**The front end review has not run since PR #653.** Its findings all shipped inside PR #654,
so nothing is outstanding, but the checks written for #654 were never spent and are carried
into the reviewer prompt below.

---

## The coder

```
You are the engineer on TechTech Flight. Repo: D:\techtechflight, branch main.

Read first: CLAUDE.md, CONTEXT.md, docs/DESIGN.md, design.md,
docs/DELIBERATE-POSITIONS.md, and both plans:
  docs/plans/2026-08-09-the-eight-from-the-tablet.md
  docs/plans/2026-08-09-make-the-demo-real.md

Twenty one changes. Do all of them. DO NOT STOP TO ASK QUESTIONS: every
decision has been made by the owner and is written below. If you meet an
ambiguity genuinely not covered, choose whichever option puts FEWER WORDS on a
Teacher's or a Student's screen, record it in docs/DECISIONS.md, and continue.

WHY THIS LIST EXISTS. Every item came from the owner holding the product on an
iPad and an iPhone. Not one was findable by reading code or running the suite.
Treat that as the standard the work is judged against.

DECISIONS ALREADY MADE. DO NOT REOPEN.
  a. A Student picks the Drone NUMBER in their hands, never a name from a list.
  b. The Teacher's change always wins over a Student's choice.
  c. No Student PIN. A Teacher PIN, yes.
  d. No cap on the Drone count.
  e. Three rules on the Student screen, never twenty.
  f. Every screen works on every device, phone included.
  g. Nothing is airborne that a Teacher did not clear.
  h. A Drone with no Student on it never flies.
  i. The Teacher never presses Recall to end a normal flight.
  j. The demo Mission is two minutes of real time, never a sped-up clock.

════════════════════════════════════════════════════════════
GROUP A. WHO IS WHO. Commits 1 to 5.
════════════════════════════════════════════════════════════

1. ROLES ARE SECRETS, NOT A CHOICE.
   Today the app only remembers which button was tapped, and Switch role lets
   anyone change their mind, so a child reaches Land and Stop in two taps. That
   breaks the safety promise made to a school.
   Student: the classroom code, public, read out loud by the Teacher.
   Teacher: a four digit PIN set once in Settings, private, never spoken.
   The door asks for the matching secret. Remove Switch role from the Student
   chrome entirely; on the Teacher side it must ask for the PIN.
   On Settings, say plainly that iPad Guided Access is the stronger lock and
   how to turn it on.

2. THE STUDENT JOIN FLOW.
   Classroom code, then their name TYPED ONCE and remembered on that device,
   then they tap the Drone NUMBER they are physically holding. Taken Drones are
   greyed out and untappable. The Teacher's board fills itself as children join.
   The Teacher can change any row in one tap and their change wins. Keep the
   existing "No Student" dropdown as that override.

3. THE STUDENT'S NAME STAYS ON SCREEN, large, for the whole lesson. It is the
   fix for a mistap, which is why there is no PIN.

4. A TEACHER CAN SEAT A STUDENT BY HAND. Tap the Drone, type the name, that
   child is flying with no tablet. A broken iPad must not stop a child flying.

5. HEARTBEAT BOTH WAYS. Nothing tracks liveness today, so a dead iPad looks
   identical to a child flying happily. The board says "Drone 3, not heard from
   for 40 seconds". The Student tablet says it has lost the board rather than
   showing frozen numbers as if they were live, which is the absent-reading
   rule applied to a whole screen. A Student can reclaim their own Drone, and
   the Teacher can free any seat in one tap.

════════════════════════════════════════════════════════════
GROUP B. THE SIMULATED FLEET OBEYS THE LESSON. Commits 6 to 10.
════════════════════════════════════════════════════════════

6. NOTHING IS AIRBORNE THAT A TEACHER DID NOT CLEAR.
   The simulator starts every Drone on the ground, airborne: false,
   altitudeM: 0, with a comment reading "Caller takes them off if the scenario
   needs them airborne". Something else lifts them: a training scenario or a
   demo fixture. Find it and stop it. Before the Lesson starts, and after it
   starts, every Drone reads 0.0 m and still.

7. AFTER A GRANT, THAT DRONE FLIES ITSELF. It climbs, flies its route and
   reaches its points. In a demo there is no child, so the simulated aircraft
   plays the child's part. No hidden control and nothing for a presenter to
   press.

8. NO STUDENT, NO TAKEOFF. A Drone in the Lesson with nobody on it never leaves
   the ground and never enters the clearance queue. The number in the air
   equals the number of devices that joined and took one.

9. HOW A FLIGHT ENDS. Every point reached, Approve appears on the Teacher's
   board, the Teacher taps it, the Student's tablet says "return home and
   land", the child flies it home, Telemetry sees it down, the Teacher
   confirms. Recall is for trouble, never for finishing a normal flight.

10. THE DEMO MISSION IS TWO MINUTES, a genuinely short Mission rather than a
    sped-up clock, and ONE SCRIPTED INCIDENT fires mid-flight: a Drone drifts
    toward a No-fly Zone, the Alert appears, the Student's tablet turns red and
    says "move away" in the same words the rules used, and the Teacher recalls
    it. That is the only place Recall appears in the demo.

════════════════════════════════════════════════════════════
GROUP C. THE MAP TELLS THE TRUTH. Commits 11 to 13.
════════════════════════════════════════════════════════════

11. NO-FLY ZONES DRAW IN ALL THREE VIEWS, as a full-height band on Side and
    Front. The code refuses them today, reasoning that "a horizontal boundary
    would look like it had a vertical extent nobody drew". That argument is now
    wrong: a No-fly Zone has no ceiling, so a Teacher watching Side sees a
    Drone sail through a zone with nothing on screen to say so. Write the ADR;
    it changes the reasoning in ADR-0019.

12. SAY WHEN A ZONE IS OUTSIDE THE WINDOW. The Scope draws a fixed window of
    space, so a zone drawn beyond it is real and invisible. The Lesson screen
    must say so rather than letting a Teacher draw something they can never
    see.

13. DRAW THE STARTING POINT. web/lib/home-point.ts already tracks it and is
    used in exactly two places, both of which print it as words. Nothing draws
    it on the Scope. Put a home marker under every Drone, and a dotted line
    from an airborne Drone to its own home, so a Teacher can see where Recall
    goes before pressing it.

════════════════════════════════════════════════════════════
GROUP D. IT WORKS ON THE DEVICE IT IS HELD ON. Commits 14 to 19.
════════════════════════════════════════════════════════════

14. EVERY SCREEN WORKS ON EVERY DEVICE, phone included. The rail becomes a
    drawer, the strips stack, the map shrinks. NOTHING IN THE HEADER MAY WRAP:
    Settings currently falls onto a second row on a narrow screen, which is why
    it appears in a strange corner.

15. THE DOOR: one centred line, two identical boxes, one word in each, no grey
    subtitle under either. Equal space above and below. Same words on every
    device; the type shrinks on small screens rather than the wording changing.
    On a phone the boxes stack and stay identical.

16. THE HEADER AND THE MENU. Go to moves to the LEFT, beside the logo, because
    navigation does not belong in the middle of a header. Mission run goes
    FIRST in its list. The panel sits below the header and never covers the
    status bar. On tablet and phone it becomes a full sheet with large targets.
    On small screens the controls fold into that same sheet; on a laptop
    Settings becomes a proper control instead of loose grey text beside three
    pill buttons.

17. THE LOGO GOES HOME. Tapping it returns to the Mission run from anywhere.
    Being stranded on Walls with no way back is the worst thing on this list.

18. THREE RULES ON THE STUDENT SCREEN, never twenty. MissionBriefing.tsx:84 is
    the TEACHER'S checklist and must never be printed for children. The three
    must use the same words as the warnings that follow: if the screen says
    "stay out of red", the warning says "move away from red", not "no-fly zone
    violation detected".

19. UNLIMITED DRONES. Delete MAX_CLASSROOM_FLEET_SIZE. Above roughly 24 the
    flight strips become a compact list rather than full strips. The board must
    stay usable at 50 and must not fall over at 200.

════════════════════════════════════════════════════════════
GROUP E. THE TWO THINGS THAT MADE ALL THIS INVISIBLE.
════════════════════════════════════════════════════════════

20. SHOOT EVERY SCREEN AT PHONE WIDTH. Every screenshot ever taken of this
    product was laptop-sized, which is why twenty one defects survived a green
    suite. Build with NEXT_PUBLIC_DEMO_ONLY=1 and shoot at 390, 820, 1180 and
    1280, both themes, TTF_SHOT_ROLE set for both roles. A fix you have not
    photographed at 390 wide is not done.

21. WALK THE WHOLE LESSON BEFORE YOU OPEN THE PR. Open the board, join a
    Student on a second device, and go end to end: join, ask, grant, fly, the
    incident, recall, approve, land, seal, score. If anything is in the air
    before you granted it, item 6 is not done.

RULES THAT DO NOT BEND
- Students never get a Command. Land, Hover, Recall, Auto-land and Stop belong
  to the Teacher, always. ADR-0011 and ADR-0021.
- Exactly two pressable things in the Student app: Ask to take off, and
  Understood. Phases come from records and Telemetry, never from a press.
- No GPS, no map tile. Metres from the Fleet's own origin, ADR-0019.
- No invented readings. Absent is said in words, never a zero and never a dash.
- No em dashes and no middots in on-screen copy. Rewrite the sentence.
- Semantic tokens only. A px font-size is a defect, ADR-0008.

HOW TO WORK
Own worktree, one branch, conventional commits, one logical change each.
Rebase, do not squash. Update docs/CHANGELOG.md and docs/DECISIONS.md, and add
anything non-obvious to the CLAUDE.md Gotchas. Gate is npm test and npm run
typecheck; there is no lint. Open one PR at the end saying which of the twenty
one are done and which, if any, you consciously left and why.
```

---

## The front end reviewer

```
You are the front end reviewer on TechTech Flight. You comment. You never
commit and you never push.

Review the branch carrying the twenty one changes from
  docs/plans/2026-08-09-the-eight-from-the-tablet.md
  docs/plans/2026-08-09-make-the-demo-real.md

Read those two plus CLAUDE.md, CONTEXT.md, docs/DESIGN-TOKENS.md,
docs/DELIBERATE-POSITIONS.md and docs/DECISIONS.md before forming an opinion.

Prototypes, whose copy is the spec, word for word but not character for
character, because they carry middots and the product deliberately does not:
  Teacher: https://claude.ai/code/artifact/a17e27e0-b6d8-44da-a424-95066847314c
  Student: https://claude.ai/code/artifact/23c6abed-f2ae-456a-bfb0-a01e63274e93

REVIEW ON A PHONE FIRST, NOT A LAPTOP.
This entire wave exists because every screenshot ever taken of this product was
laptop-sized and twenty one defects survived a green suite because of it. Build
with NEXT_PUBLIC_DEMO_ONLY=1, then scripts/shot.mjs from PowerShell, not Git
Bash. Shoot 390, 820, 1180 and 1280, both themes, TTF_SHOT_ROLE set for both
roles. Start at 390 and work up. If you review this at 1280 first you will
repeat the mistake that caused it.

WALK THE LESSON, DO NOT READ IT.
Open the board, join a Student on a second device, and go end to end: join,
ask, grant, fly, the incident, recall, approve, land, seal, score. Most of what
you are checking is a sequence, not a screen.

WHAT MATTERS MOST, IN ORDER

1. Is anything in the air that nobody cleared? Open the board cold, before
   starting a Lesson. Every Drone must read 0.0 m and still. This is the item
   the owner found in one glance and it is the one that undoes the product's
   own story.
2. Does a Drone with no Student on it stay on the ground and stay out of the
   clearance queue?
3. Can a child reach the Teacher board? Try. Switch role must be gone from the
   Student side and must ask for the PIN on the Teacher side. This is a safety
   promise made to a school, not a nicety.
4. Exactly two pressable things in the Student app. A third is a stop-the-line
   finding.
5. No press advances a Student's own screen. Trace every phase change back to a
   record or to Telemetry.
6. Approve cannot appear before every point is reached. Try to make it appear
   early.
7. Nothing in the header wraps at any width. Settings landing in a strange
   corner is the symptom this wave was meant to kill.
8. Can you get back to the Mission run from Walls, both from the menu and by
   tapping the logo?
9. No-fly Zones draw on Side and Front as full-height bands, and a zone outside
   the window is announced rather than silently hidden.
10. The home marker and the dotted line to home are on the Scope, not only in
    words.
11. The Student screen carries three rules, not twenty, and the warning that
    fires later uses the same words those rules used.
12. No invented readings. A figure the Fleet is not sending is absent in words,
    never a zero and never a dash. A frozen screen after a heartbeat is lost is
    the same defect at whole-screen scale.
13. Tokens only. web/type-scale.test.ts refuses any text-* with no token; check
    it still catches what it claims.

BEFORE YOU CALL ANYTHING STOP-THE-LINE
Run the path to the end. On 2026-08-07 a review reported that a Teacher's grant
never reaches the Student tablet, because ControlScreen built a value and
appeared to discard it. The write happens two calls deeper, and the threading
itself is load-bearing: it stops a grant and a hold answered in one press from
overwriting each other. That finding was wrong, was reported as verified, and
nearly caused correct code to be deleted. Say which findings you ran and which
you only read.

DO NOT RAISE
The six positions in docs/DELIBERATE-POSITIONS.md. The existence of either
rail, both ruled on by the owner. Em dashes in JSDoc. Issue #623 and the header
controls, held out of scope on purpose. The theme not surviving hydration and
React #418, both named as out of scope.

HOW TO REPORT
Run /code-review for the standards and spec pass, then add your own findings
with the screenshots attached, phone widths first. Severity first. For each
finding: what you saw, which file and line, what it should be instead, whether
it is a defect or a matter of taste, and whether you ran it or read it.
```
