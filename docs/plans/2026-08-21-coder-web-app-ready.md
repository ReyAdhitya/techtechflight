# Coder prompt — web app functionally complete, 2026-08-21

Paste the fenced block to the coder. This supersedes
`docs/plans/2026-08-21-coder-whats-left.md` as the live job. That file is a record of
what was asked before #673; do not rebuild items it listed as 1–6.

**What “functionally complete and ready” means here:** a Teacher can run a whole simulated
lesson on the school path, a Student can join from a phone, and the records survive. Not
the 340 leftover tickets. Not flying a real aircraft. Not Land/Stop to hardware.

---

```
You are the engineer on TechTech Flight. Repo: D:\techtechflight. Windows. PowerShell.

Read first, in this order:
  CLAUDE.md (Gotchas twice)
  CONTEXT.md (the words)
  docs/DELIBERATE-POSITIONS.md
  docs/plans/2026-08-17-the-local-flight-deck.md  (Done A / Done B)
  docs/plans/2026-08-21-qa-full-web-app.md        (the path a lesson must walk)
  docs/plans/2026-08-21-coder-web-app-ready.md    (this file)

You make the TEACHING PRODUCT walkable end to end on the school path, then you stop.

THE SCHOOL PATH (this is “the app”, not :3000):
  Double-click Start TechTech Flight.bat
  Teacher:  http://localhost:4321/mission   (camera works here)
  Student:  http://<lan>:4321/student       (printed URL + QR + Settings Copy)
  Fleet:    Simulator (default)
  Do not press “Set up a demonstration lesson” to prove the product.
  :3000 is a developer preview. A tablet stuck on Opening there is a known
  Next.js block. Do not “fix” it by telling a child to open :3000.

DO NOT STOP TO ASK QUESTIONS already answered in the plans or DECISIONS.md.
If something is genuinely missing, choose the option that puts FEWER WORDS on
a Teacher or Student screen, write it in docs/DECISIONS.md, continue.

THE GATE: npm test and npm run typecheck. There is no lint.
The suite is flaky at full parallelism. If a file fails alone it is yours; if
it only fails in the herd, run at --maxWorkers=2 and say so.
Old tests must still pass. Do not skip, loosen, or cast to any.

jsdom will not catch a tablet stuck on Opening, a missing hatch, or a Mission
nobody can finish. Prove those by using the board.

════════════════════════════════════════
WHERE IT ALREADY STANDS — DO NOT REBUILD
════════════════════════════════════════

#672 is on main. #673 (feat/local-flight-deck-done-a) finishes Done A locality.
If #673 is still open, continue on that branch. If it has merged, one follow-up
PR off main. Do not open a parallel rebuild of 1–6.

Already in the tree (verify, do not rewrite):
  Classroom GET/PUT on the ground station, merge on rev, poll backoff
  Launcher QR generated locally, iPads open /student, Settings Copy of that URL
  Virtual adapters skipped so Docker 172.17 is not what a phone scans
  School drones (Wi-Fi) as a third Classroom setup path; Simulator default;
    Radio stays; monitoring only
  Records file at Documents\TechTech Flight\records.db, written at Lesson start,
    end and seal; browser copy remains; file wins (including a vacant browser);
    Neon off until the Settings box is ticked
  Save a copy of my records / Export for a spreadsheet
  Demonstration seed: presses what a Teacher presses, points included, steps
    1–11 open, step 12 stays shut (sealing is a judgement), refuses a real roll
  Technician zip: npm run package:school, Node carried, notes page,
    records.db stays in Documents
  ESP door on UDP 14555; scripts/send-esp-packets.mjs

#673 claimed 1–6 done and left the two-device proofs. That claim was checked.
The locality work is in the product. The LESSON PATH is not.

════════════════════════════════════════
WHAT “READY” IS  (stop when this is true, not when the suite is green)
════════════════════════════════════════

A Teacher who has never seen the code can:

  1. Double-click Start TechTech Flight.bat
  2. Start a Lesson, skip the warm-up, pick Search and Rescue (NO seed)
  3. Draw one no-fly zone that is on the picture
  4. Put teams on craft, tick pre-flight (Propellers by hand), tick the brief
  5. A Student on a phone opens the printed URL, types the code, picks a Drone,
     asks to take off
  6. Teacher grants. The simulated Drone flies the points. Approve appears
     only when the points are reached. Teacher approves. It comes home.
  7. Step 11 seals. Step 12 debrief. Records: class list, one child.
  8. Save a copy of my records lands a file on the Desktop.
  9. Pull the internet cable. The classroom carries on. Teacher still sees
     the name.

If any of those fail, it is not ready. The demo button is a SHOW path, not
the product path.

Done B (a real aircraft reporting) is NOT this job. The door is built.
Do not wait for the drone team. Do not invent readings.

════════════════════════════════════════
ORDER. Do not skip 0. Do not polish until A and B are proved.
════════════════════════════════════════

0. BRANCH
   Continue #673 if it is open. Otherwise branch from current main.
   Do not re-implement the locality list above.

────────────────────────────────────────
1. STOP-THE-LINE A — a Teacher can finish Search and Rescue
   THIS IS THE PRODUCT. Do it first. Do not touch the zip or the seed
   until this is true.

   RAN 2026-08-21. chooseScenario writes a Mission with checkpoints: [].
   Grant then calls flyRoute with an empty list: the simulated Drone
   leaves the ground and is immediately done. step 7 reads 0 airborne.
   allPointsReached([]) is false by design, so Approve never appears.
   The tablet says “8 minutes 0 checkpoints”.

   The seed and demo-mission.ts already write points. That is a bypass.
   A Teacher tapping Search and Rescue on step 1 is the product.

   What to do:
     Put default fly-to points on each built-in Mission Scenario in
     web/lib/mission-scenarios.ts (catalogue-as-data, same file as the
     names and the time limit). Search and Rescue, Delivery, and
     Building Inspection each need a route a class can finish.
     Points sit inside the Scope window (CLASSROOM_GEOFENCE: about
     −4 to 4 m east, −3 to 3 m north). Not on the netting. Not a
     20 m square. A point the picture cannot show is a point nobody
     can fly to.
     chooseScenario writes those points AND the Scenario’s
     defaultLimitMinutes onto the Mission (and ClassroomOpen already
     copies checkpoints into the classroom session).
     Changing Scenario replaces the points with the new Scenario’s
     defaults. Keep the zones a Teacher already drew.
     A Mission with no Scenario, or an unknown Scenario, still has
     checkpoints: []. allPointsReached([]) stays false for that case.
     Search and Rescue is not that case.

   Do not add a points-drawing screen. There isn’t one. The catalogue
   is the route until a Teacher can draw points (that is not this job).

   Prove WITHOUT the seed:
     Start a Lesson. Pick Search and Rescue. Put one team on one craft.
     Tick pre-flight and the brief. Student asks. Grant. Watch the
     Drone fly the points on step 7. Approve appears. Do Delivery the
     same way once, so the catalogue is not SAR-only.

   Tests:
     chooseScenario(lessonId, 'search-rescue') → checkpoints.length > 0
     emptyMission still has []
     allPointsReached on [] still false
     Old tests still pass.

────────────────────────────────────────
2. STOP-THE-LINE B — a zone on the grid is on step 7
   RAN 2026-08-21. Zone drawn on step 2 in the Scope’s metres, red hatch.
   Step 7: rail says 1 no-fly zone; Top-down has no hatch and no leftover
   sentence. CLAUDE.md forbids a key that names a hatch that is not on
   the picture, AND forbids a silent miss.

   The leftover copy (hiddenZones / zoneShowsInWindow) already exists.
   Either the drawing surface and the Scope are not the same window, or
   the zone is not reaching step 7, or it is filtered out. Find which.
   Do not “fix” it by hiding the rail count. Do not put a boundary box
   back to get a ruler (the grid carries the scale).

   Both step 2 and step 7 must use the same metres (scopeWindow /
   CLASSROOM_GEOFENCE). A zone a Teacher draws on the grid must hatch
   on Top-down, and band on Side and Front (ADR-0029), or be NAMED as
   outside this picture.

   Prove: draw a zone that is on the grid. Photograph step 7 Top-down,
   Side and Front. Rail count, hatch, and leftover sentence must agree.
   Put the shots in the PR description (scripts/shot.mjs after a build,
   or a phone photo of the live board). jsdom will not catch this.

────────────────────────────────────────
3. SHOULD-FIX from the same QA pass (after A and B, same PR)

   a. Student tab on :3000 says Drone 1 not reporting while Teacher has
      Telemetry. Two FleetProviders, two sims in DEMO_ONLY. The classroom
      is :4321 (one ground station). Do NOT invent a shared sim across
      two origins. On a Student tab that has no Fleet, SAY SO and point
      them at the ground-station URL. Ask to take off must not depend
      on a second Fleet that never connected. Propellers / Telemetry
      after Teacher 7 of 7 is the same seam.

   b. / and /walls in the same session as a live Mission showed 6 Offline
      / lost link. A Teacher opening Fleet or Walls mid-lesson must see
      the SAME Fleet as step 7. One connection. Do not remount a second
      Simulator that looks like the class fell out of the sky.

   c. Change classroom must keep the name (Which classroom? + still her
      tablet). Leave may clear the name. changeClassroom() already keeps
      techtechflight:student-seat; if the field is empty, the screen is
      not reading it back. Fix the screen, not the rule.

   d. Student rail truncates at 390 (“4 Co…”). Product, not the Next.js
      badge. No sideways scroll. A scroll container is a positioning
      context (relative). web/scroll-containers.test.ts already refuses
      a scroller without it.

   Do not “fix” these, they already passed:
     /reports staying on /reports (standing screen; step 12 is the
     sealed Mission)
     /enter PIN
     Hold/Grant
     :4321 phone join (code accepted)
     board owns the room after Leave on the Teacher laptop’s Student tab

────────────────────────────────────────
4. WALK THE LESSON ON THE SCHOOL PATH AND FIX WHAT FAILS

   Use docs/plans/2026-08-21-qa-full-web-app.md section 3, path A–L,
   on :4321, Simulator, NO seed.

   Stop-the-line if any of these fail (QA section 5):
     1. Something airborne with no Teacher clearance.
     2. A child can reach Land / Stop / Recall.
     3. A third Mission press on the Student app (Ask to take off and
        Understood are the two; join / leave / change / looking-back
        on the rail are not Mission presses).
     4. A Student’s screen advancing because they tapped, not because
        of a record or Telemetry.
     5. Invented numbers (zero or dash standing in for “not reporting”).
     6. Approve while points are outstanding.
     7. No-fly drawn on one view and “clear air” on another for the
        same zone.
     8. Switch role on the Student chrome, or Teacher switch without PIN.

   Also still true, do not regress:
     Simulated craft: six pre-flight items pass themselves and say so;
       Propellers still ticked by hand. Faults arrive in the air, never
       on the bench.
     Skip warm-up once is skipped for that Lesson.
     Grant and Hold are records; Held stays in the queue.
     A Drone with no Student never enters the queue and never takes off.
     Nothing leaves the ground that a Teacher did not clear.
     Land all · Hover all · Stop all on every in-the-air step.
     Alerts live on step 10 alone (ADR-0032 — a ruling, not a bug).
     Classroom boundary blue dashed, no-fly red hatched, amber means
       needs you and nothing else (ADR-0033).
     Three state vocabularies stay apart (ADR-0020).
     Screens may not import fleet-core/simulator.

   If you find a new stop-the-line on this walk, fix it in this PR.
   If you find a nit, write it in the PR, do not chase it past ready.

────────────────────────────────────────
5. SURFACES A TEACHER ACTUALLY OPENS  (after the path is green)

   Load each on the school path. Fix anything that makes a lying empty
   screen or a broken door. Do not redesign them.

     /mission     the lesson (already walked)
     /student     Student chrome only. No Land, Hover, Stop, Recall.
     /settings    Classroom setup, iPad URL + Copy, PIN, Guided Access,
                  records buttons, demonstration seed, off-site box off
     /students    roll, seating by hand
     /records     class list and one child
     /            Fleet — same Fleet as the Mission
     /vision      detector honesty (demo boxes vs real model). Camera
                  needs localhost or https. Do not put boxes on Telemetry.
     /enter       door

   /lesson /control /reports still resolve to the matching rail step.
   Header does not wrap. No horizontal overflow at 390.
   Print of Reports: light on white.

   Not this job: /history /maintenance /drone /tower /demo /showcase
   polish, Large format (#623), theme-drops-on-hydrate (named, known).

────────────────────────────────────────
6. PROVE IT  (a green suite is not this list)

   Code proofs (you run):
     [ ] A without seed: SAR, grant, Drone flies points, Approve appears
     [ ] Delivery once, same
     [ ] B: photographs of step 7 Top-down, Side, Front with a zone on
         the grid
     [ ] npm test -- --maxWorkers=2
     [ ] npm run typecheck
     [ ] Seed still refuses a real class list; step 12 still shut until
         a Teacher seals

   Room proofs (phone in the room; if you have no phone, leave the box
   empty and do NOT claim ready):
     [ ] Point a phone at the launcher QR once. If the square is wrong,
         the printed URL above it still works.
     [ ] Phone opens http://<lan>:4321/student, types the code, joins
     [ ] Cable out: ask to take off, Teacher still sees the name
     [ ] Save a copy of my records → Desktop file
     [ ] Double-click on a machine / zip that has never run it, or say
         you could not and why

   School drones live on the board is NOT required for ready.
   scripts/send-esp-packets.mjs is the proof if Settings is on School
   drones and the ground station was restarted. Photograph if you can;
   do not block the lesson path on it.

════════════════════════════════════════
NOT YOUR JOB
════════════════════════════════════════

  Owner: Phase 0 on an iPad (does this Wi‑Fi reach the laptop). Static IP.
         Tape the trolley card. Send the three drone-team questions.
         Rotate the Cloudflare token that was pasted in chat.
  Drone team: does anything come back, what a packet looks like, fixed ids.
  QA: re-walk docs/plans/2026-08-21-qa-full-web-app.md AFTER you land A and B.

  Do not start the 340 open feature tickets.
  Do not implement Land/Stop to hardware (Phase 4, own ADR).
  Do not put live altitude / battery / position in the database.
  Do not add a go-area / Mission Zone back (ADR-0027).
  Do not add a points-drawing editor.
  Do not rebuild the seed, the zip, the records writer, or the QR unless
  A or B proves they are wrong.
  Do not special-case a screen so the rail opens. Make the condition true.
  Do not bypass isMissionStepOpen.
  Do not make :3000 the classroom.

════════════════════════════════════════
HOW TO COMMIT
════════════════════════════════════════

Conventional commits, one logical change each. If the subject needs
“and”, it is two commits. Closes nothing that is not actually closed.

Update docs/CHANGELOG.md, docs/DECISIONS.md, CLAUDE.md Gotchas for
anything non-obvious.

Open ONE PR (or continue #673). The body says:
  - A proved without seed (yes/no, how)
  - B photographed (yes/no, attach)
  - which of 3a–3d you did
  - which room proofs you ran, which you left for the owner
  - you do not claim ready if A is unproved

Title it like a Teacher would notice, not like a branch name.
```
