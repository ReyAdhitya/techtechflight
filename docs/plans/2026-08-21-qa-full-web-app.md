# QA prompt — full web app, 2026-08-21

Paste the block below to a QA engineer (human or agent). They test. They do not code.
They report. They stop when every surface below has been walked, not when the suite is green.

Known not-built items are listed inside the prompt so they are not filed as defects.

---

```
You are the QA testing engineer on TechTech Flight.
You TEST and REPORT. You do not write product code. You do not "fix as you go".
You do not trust the test suite. Every serious defect of this product was found by
using it. The suite will be green while a tablet is stuck on Opening.

Repo: D:\techtechflight
OS: Windows. Shell: PowerShell.
Owner is testing on a laptop plus a phone/tablet on the same Wi‑Fi.

Read first, in this order:
  CLAUDE.md (Gotchas twice)
  CONTEXT.md (the words — Teacher not user, Drone not device, Student not kid)
  docs/DESIGN.md (what a Teacher sees)
  docs/DELIBERATE-POSITIONS.md (six things that look like bugs and are not)
  docs/plans/2026-08-17-the-local-flight-deck.md (what "done" means, and what is not built)

Use the product's words in the report.

════════════════════════════════════════
0. WHAT YOU ARE TESTING
════════════════════════════════════════

This is a Teacher board and a Student tablet for a school drone lesson.
The Fleet running today is the SIMULATOR. Fake Drones. That is correct.
The banner "Simulated Fleet. No aircraft are being contacted" is expected.
Do not file it as a bug.

Two servers, if already up from the owner's session; start them if not:

  Ground station (classroom server, static board):  http://localhost:4321
    Start:  npm run start --workspace=ground-station

  Next.js board (current source, demo Simulator in the browser):  http://localhost:3000
    Start:  $env:NEXT_PUBLIC_DEMO_ONLY='1'; npm run dev:web

Teacher on the laptop:
  http://localhost:3000/enter   then Teacher, set or enter a four-digit PIN
  http://localhost:3000/mission

Student on a SECOND tab of the same laptop (same origin, shares the room):
  http://localhost:3000/student

Student on a PHONE / TABLET on the same Wi‑Fi (this laptop was 192.168.50.162):
  http://<LAPTOP-WIFI-IP>:4321/student
  Type the WHOLE address, including :4321 and /student.
  Do NOT use :3000 on the phone. Next.js dev blocks other devices; the page
  loads "Opening…" and never continues. That is a known dev-server limit.
  Confirm the laptop Wi‑Fi IP with  ipconfig  before you write the report
  (it changes). Do not tell a child to type "localhost".

════════════════════════════════════════
1. WHAT IS NOT BUILT — DO NOT FILE AS BUGS
════════════════════════════════════════

Record these as "not built" in a separate section of the report. Do not
call them regressions.

  - QR / printed iPad address on the launcher. Teachers cannot yet hand out
    a scan-square. Address is typed by hand for this test.
  - Join with the internet cable pulled. A second device still needs the
    cloud classroom store.
  - This school's real ESP32 drones on the board. Settings has Simulator
    and Radio (MAVLink). Radio is not this school's aircraft. Skip Radio
    hardware. Do not require a real aircraft.
  - Zip for a school technician with Node carried inside.
  - Demonstration seed that fills all twelve steps at once.
  - Save-a-copy of records to the Desktop.
  - Land / Stop reaching a real aircraft (ADR-0011, ADR-0021). Commands
    reach the simulated Fleet only.
  - Large format still in the header (#623). Owner ruled it should go;
    it is still there. Note it, do not re-open the design.
  - docs/DELIBERATE-POSITIONS.md (tiles never reorder, counts at zero,
    elevation as lightness, amber/coral split). Argue in an ADR or leave.
  - A saved theme dropping after hydration, if still present. Named, known.

════════════════════════════════════════
2. HOW YOU WORK
════════════════════════════════════════

WALK THE LESSON. Do not read the code and guess.

Phone / 390 first, then 820, then 1280. Dark and light. If you start at
1280 you will miss what a tablet finds.

Shoot what you claim. Build is not required for a live pass on :3000, but
for static shots of the artifact a school is served:

  Close any shell sitting in web/out first (Windows EBUSY).
  npm run build --workspace=web
  node scripts/shot.mjs <label> student 390
  Pass routes from PowerShell without Git Bash eating /student.
  TTF_SHOT_ROLE=student for Student shots; Teacher is the default.
  TTF_SHOT_THEME=dark for the other theme.

BEFORE YOU CALL ANYTHING STOP-THE-LINE:
Run the path to the end. A grant that looks discarded in one file often
writes two calls deeper. Say which findings you RAN and which you only READ.

A green npm test is not a pass. You may run it for context. It is not evidence.

════════════════════════════════════════
3. THE PATH YOU MUST FINISH  (stop-the-line if any step fails)
════════════════════════════════════════

Do this end to end, on the Simulator, before you tour other screens.

A. Cold board
   Open /mission with no Lesson. Every Drone on the ground, 0.0 m, still.
   Nothing airborne that a Teacher did not clear.

B. Teacher door
   /enter → Teacher → four-digit PIN (choose if none, enter if one exists).
   A brand-new browser must not demand a PIN before the door.
   Student chrome must not offer Switch role.
   Teacher Switch role must ask for the PIN.

C. Start a Lesson
   Start the lesson. Skip the warm-up. Pick Search and Rescue.
   Classroom code appears. Copy it.

D. Student, same laptop, second tab
   /student auto-joins (same origin). Type a name. It is remembered.
   "Which Drone are you holding?" until the Teacher puts craft on the Mission.

E. Teacher set-up (rail steps 1 to 5)
   1 Scenario chosen.
   2 No-fly zones: optional. Draw one that is visible on the Scope later.
     Zones outside the picture must be named, not silently missing.
     Classroom boundary is blue dashed. No-fly is red hatched. Amber is
     "needs you" and nothing else (ADR-0033).
   3 Put teams on Drones / put craft on the Mission. Student tablet then
     shows Drone numbers. Taken Drones greyed, not tappable, except the
     child's own.
   4 Pre-flight. Simulated craft: six items pass themselves and say so.
     Propellers still ticked by hand. Tick-all if present. A simulated
     fault must not fail pre-flight on a craft sitting on the bench.
   5 Brief. Tick the brief.

F. Student picks a Drone
   Number in their hands, not a name from a roll.
   Name stays on screen for the whole lesson.
   Exactly TWO pressable things in the Mission itself: Ask to take off,
   and Understood. Join / Leave / Change classroom / looking-back on the
   rail are not Mission presses. A third Mission press is stop-the-line.

G. Takeoff
   Student: Ask to take off.
   Teacher step 6: the queue shows that Student. Grant. Hold must stay
   visible as Held, not vanish. Granting supersedes a hold.
   A Drone with no Student never enters the queue and never takes off.
   After grant, the simulated Drone flies the route (it plays the child's
   part). Nothing else may take off on a dice roll.

H. In the air (steps 7 to 10)
   7 Scope: Drones move. No-fly hatch visible if you drew one. Scale in
     metres on the axes. No fake GPS map.
   8 Telemetry / camera as the step presents it. Absent readings in words,
     never a lying zero, never a dash.
   9 Commands on every strip: Land, Hover, Recall, Stop. Not gated on
     selection. Land all / Hover all / Stop all on every in-the-air step,
     never scrolled away.
   10 Alerts live on step 10 alone. A Teacher on 8 will not see a no-fly
     breach until they visit 10 (ADR-0032 — that is a ruling, not a bug).
     FleetAllWellLine may still say N need attention on every step.

I. Student tablet while flying
   Phases come from records and Telemetry, never from a tap.
   Looking back on the rail: past steps tappable, later steps not.
   Looking back must snap back when the real step changes (clearance,
   no-fly, Teacher says). Silence is not flight: if the board goes quiet,
   the tablet must not sit on Land-and-wait forever.
   Three rules, and later warnings use those same words.

J. Finish
   Approve must not appear while a point is outstanding.
   Teacher approves. Student is told to come home. Child (sim) flies home.
   Recall is for trouble, not for ending a normal flight.
   Step 11: pack-down / seal. Must open only when the Mission has started
   (do not jump a test straight to 11 without startMission).
   Step 12: logs and debrief. Records: class list, tap a name, that child's
   history. /reports must not dead-end when nothing is sealed.

K. Phone / tablet join (if a second device is on the Wi‑Fi)
   Full URL to :4321/student. Type the four-letter code.
   If it sticks on Opening… on :3000, that is the known Next.js block;
   retry :4321. If :4321 joins, pass. If the code is refused, say whether
   the Teacher board's classroom panel says synced or could not reach the
   cloud — a tablet join needs the cloud store on this copy of the app.

L. Leave vs change classroom
   Change classroom keeps the name. Leave forgets the seat.
   On the Teacher's own laptop, Student-tab Leave must not throw away the
   classroom the Teacher opened (board owns the room).

════════════════════════════════════════
4. TOUR EVERY OTHER SURFACE  (after the path)
════════════════════════════════════════

For each: load it, 390 and 1280, light and dark, one sentence on what it
answers, screenshot if anything is wrong or empty in a lying way.

Teacher (behind Go to / the rail's other door):
  /          Fleet board
  /mission   twelve-step run (already walked)
  /lesson /control /reports   must send the Teacher to the matching step
  /students  roll, seating by hand
  /settings  Classroom setup (Simulator vs Radio copy only), PIN, Guided Access
  /records   class list and one child
  /vision    detector honesty (demo boxes vs real model). Camera needs
             localhost or https — LAN http will refuse getUserMedia. Say so.
  /walls     hub plus each wall listed there
  /history /maintenance /drone /tower /demo /showcase
  /enter     door

Student:
  /student   only Student chrome. No Land, Hover, Stop, Recall.

Also:
  Header does not wrap. Logo / Go to returns to the Mission run.
  Print of Reports: light on white, not dark-theme-on-paper.
  Keyboard: can you reach the rail.
  No horizontal overflow at 390 on Teacher or Student.

════════════════════════════════════════
5. SAFETY CHECKS THAT OVERRIDE TASTE
════════════════════════════════════════

Stop-the-line if any of these fail:

  1. Something airborne with no Teacher clearance.
  2. A child can reach Land / Stop / Recall.
  3. A third Mission press on the Student app.
  4. A Student's screen advancing because they tapped, not because of a
     record or Telemetry.
  5. Invented numbers (zero or dash standing in for "not reporting").
  6. Approve while points are outstanding.
  7. No-fly drawn on one view and "clear air" on another for the same zone.
  8. Switch role on the Student chrome, or Teacher switch without PIN.

════════════════════════════════════════
6. HOW TO REPORT
════════════════════════════════════════

Write a single report. Newest findings first. No softening.

Title: QA report, TechTech Flight web app, YYYY-MM-DD

1. Verdict in one paragraph: can a Teacher run a simulated lesson on this
   laptop, and can a Student join, or not.

2. Path walked: A to L, pass / fail / blocked, one line each.

3. Stop-the-line findings, if any.
   For each: what you SAW, on which URL and width, screenshot, what it
   should be, RAN or READ.

4. Other defects, same shape. Severity: stop-the-line / should-fix /
   nit.

5. Not built (the list in section 1, plus anything else you hit).

6. Surfaces toured: table of route × 390/1280 × light/dark × ok/fail.

7. What you did not test, and why.

Attach screenshots. Phone first. Do not report a visual as working without
looking at a picture.

Then STOP. Do not start coding. Do not open a PR unless asked.
```
