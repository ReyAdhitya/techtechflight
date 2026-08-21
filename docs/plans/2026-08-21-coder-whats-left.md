# Coder prompt — what is left to complete, 2026-08-21

The teaching product is done. What is left is locality, address for iPads, a records file,
a seed, a technician zip, and a door for this school's drones.

Paste the fenced block to the coder. Plan: `docs/plans/2026-08-17-the-local-flight-deck.md`.
Most of items 1–3 already exist in **PR #672** (`task/local-flight-deck`), unmerged. Land
that first. Then finish what the PR itself said was not done.

---

```
You are the engineer on TechTech Flight. Repo: D:\techtechflight. Windows. PowerShell.

Read first: CLAUDE.md, CONTEXT.md, docs/DELIBERATE-POSITIONS.md,
docs/plans/2026-08-17-the-local-flight-deck.md,
docs/plans/2026-08-21-coder-whats-left.md.

You complete Done A (a laptop demo with the cable out). Done B (a real aircraft
reporting) is the door plus the drone team's packets — build the door, do not wait
for them, do not invent readings.

DO NOT STOP TO ASK QUESTIONS already answered in the plan. If something is genuinely
missing, choose the option that puts FEWER WORDS on a Teacher or Student screen,
write it in docs/DECISIONS.md, continue.

THE GATE: npm test and npm run typecheck. There is no lint.
The suite is flaky at full parallelism. If a file fails alone it is yours; if it
only fails in the herd, run at --maxWorkers=2 and say so.
Old tests must still pass. Do not skip, loosen, or cast to any.

Prove on TWO DEVICES where the item is about joining: Teacher laptop + a phone.
jsdom will not catch a tablet stuck on Opening.

QA 2026-08-21 walked A–L on this laptop (Simulator, :3000 and :4321).
Report in the owner chat. Two stop-the-line findings are confirmed in code.
Do those before zip/polish. Seed button and Save-a-copy already exist on Settings;
QA did not press them. Do not rebuild those panels. Do make the *normal* Teacher
path (pick Search and Rescue, no seed) finishable.

════════════════════════════════════════
FROM QA — DO THESE FIRST
════════════════════════════════════════

STOP-THE-LINE A. Search and Rescue is a Mission nobody can finish.
  RAN. chooseScenario writes a Mission with checkpoints: []. flyRoute then gets
  an empty route: the simulated Drone leaves the ground and is immediately done,
  so step 7 reads 0 airborne. allPointsReached([]) is false by design
  (student-progress.test.ts), so Approve never appears. The tablet says
  "8 minutes 0 checkpoints".
  demo-mission.ts and demonstration-seed.ts already write points. The seed is
  a demo bypass. A Teacher tapping Search and Rescue on step 1 is the product.
  When they pick a Scenario, write that Scenario's points onto the Mission
  (and into the classroom session). Then flyRoute has a route, points can tick,
  Approve can appear. Prove without pressing the seed: pick SAR, grant, watch
  the Drone fly points, Approve appears. Empty-array allPointsReached stays false
  for a Mission that honestly has no points; SAR is not that Mission.

STOP-THE-LINE B. Rail says 1 no-fly zone; Scope on step 7 shows clear air.
  RAN. Zone was drawn on step 2 in the Scope's metres, red hatch. Step 7: rail
  counts it, Top-down has no hatch and no leftover sentence. CLAUDE.md already
  forbids a key that names a hatch that is not on the picture, and forbids a
  silent miss. visibleZones / zoneShowsInWindow / leftover copy. Photograph
  step 7 Top-down, Side and Front after drawing a zone that is on the grid.

SHOULD-FIX (same QA pass; do after A and B, same PR is fine):
  - Student tab on :3000 says Drone 1 not reporting while Teacher has Telemetry.
    Two FleetProviders, two sims in DEMO_ONLY. Classroom path is :4321 (one
    ground station). Either share one Fleet on one origin, or say on the Student
    tab that this preview has no Telemetry and join via the ground station.
  - Student still shows Propellers open / no Telemetry after Teacher 7 of 7.
    Same seam. Ask to take off must not depend on a second Fleet that never
    connected.
  - / and /walls in the same session as a live Mission showed 6 Offline /
    lost link. A Teacher opening Fleet mid-lesson must see the same Fleet as
    step 7.
  - Change classroom on the Teacher laptop did not keep Amira in the name
    field (Which classroom? + still her tablet). Leave may clear the name;
    Change must not.
  - Student rail truncates at 390 (4 Co…). Product, not the Next.js badge.

QA also: /reports staying on /reports is correct (standing screen; step 12 is
the sealed Mission). /enter PIN, Hold/Grant, :4321 phone join, board owns the
room after Leave — those passed. Do not "fix" them.

════════════════════════════════════════
ORDER. Do not skip 0.
════════════════════════════════════════

0. LAND OR FINISH PR #672 FIRST
   https://github.com/ReyAdhitya/techtechflight/pull/672
   Open, mergeable, CI green last seen. If it still merges cleanly: merge to main,
   then continue from 4 on main. If it conflicts: rebase, gate, then merge.
   Do not re-implement 1–3 on a parallel branch.

   Already in that PR (do not rebuild):
     classroom GET/PUT on the ground station, merge on rev, poll backoff,
     code panel tells the truth, launcher QR + printed iPad address,
     ADR-0035, SQLite file create, ESP32 UDP door on 14555,
     Cloudflare Workers deploy workflow, tracker sweep notes.

   The PR itself said these were NOT done. That is your remaining code:
     records WRITER at lesson boundaries, file wins over browser, Neon off by
     default, two Settings buttons; demonstration seed; school zip.

1. QR AND ADDRESS ON THE LAUNCHER  — in #672, verify after merge
   Double-click Start TechTech Flight.bat.
   It prints the laptop's LAN address for iPads and draws a QR generated in
   scripts/classroom-address.mjs (no chart API — a room with no internet cannot
   fetch a QR). Teacher board still opens on localhost (camera).
   Prove: point a real phone at the QR once. The PR said this was never scanned.
   If the QR is wrong, the printed URL above it is the fallback.

   Settings (or the classroom code panel) must also show the same iPad URL in
   words a Teacher can copy, so they can write the trolley card without reading
   a terminal window. If #672 only prints in the launcher console, add that one
   line on Settings. Fewer words. No second QR library in the board unless the
   launcher one can be reused.

2. JOIN WITH THE CABLE PULLED  — in #672, verify after merge
   Ground station serves GET/PUT /api/classroom, JSON file on disk, merge ported
   not rewritten, settle on ClassroomSeat.rev never updatedAt, three runtimes in
   web/standards.test.ts.
   Board served by the ground station talks to the ground station (same origin,
   by port, not a build seed).
   Prove: Teacher on localhost:4321, phone on http://<lan>:4321/student, type the
   code, pull the internet, ask to take off, Teacher still sees the name.

3. THIS SCHOOL'S DRONES ON THE BOARD  — door in #672; Settings still lies
   The door is UDP 14555, small JSON, id required, absent means cannot report,
   unknown id not invented, malformed dropped, sender remembered.
   Monitoring only. Not CommandableSource. Not MAVLink.
   After merge, Settings Classroom setup still offers Simulator vs Radio (MAVLink).
   That is the wrong second choice for this school.
   Add a third path in the same panel, same restart rule: "School drones (Wi-Fi)".
   It selects the ESP source the way Radio selects MAVLink. Keep Radio in the
   tree; do not delete it; do not make it the classroom default.
   Default stays Simulator.
   Prove with no aircraft: send two valid packets and one junk from the laptop
   itself; board shows the two, ignores the junk, never a zero for a missing field.
   Land/Stop reaching hardware is NOT this ticket (Phase 4, own ADR).

4. RECORDS FILE THAT A LESSON ACTUALLY WRITES  — started in #672, not finished
   ADR-0035 first if somehow not on main after merge.
   Documents\TechTech Flight\records.db, eighteen tables, node:sqlite, no extra dep.
   Ground station writes at lesson boundaries only. No live readings.
   Browser copy remains so the board works with GS closed; the file wins when
   they disagree.
   Neon stays in the tree, defaults OFF.
   Settings: "Save a copy of my records" → dated file on the Desktop.
             "Export for a spreadsheet".
   No Teacher is told a file path except by those buttons.

5. DEMONSTRATION SEED  — not started
   One button in Settings (or a launcher flag). Writes the same records a real
   lesson writes: Scenario, zones, teams, pre-flight, Lesson started, children,
   flights, points. Every rail step then opens because its condition holds.
   Labelled as a demonstration in the record.
   Refuses to run when the roll holds real children.
   No screen special-cased. No fake Telemetry.

6. ZIP FOR A TECHNICIAN, NO TYPED npm  — not started
   One folder. Unzip to C:\TechTech Flight. Double-click. No git.
   Carry a Node runtime beside the app so a technician never sees a version
   number (plan recommendation).
   First run: install if needed, build the board once, create records.db, start,
   open. Launcher already does most of this; it must not fail differently on a
   machine that has never seen Node in PATH because Node is next to the app.
   records.db stays in Documents, never in the app folder, so replacing the
   folder for an update cannot destroy a term of attendance.
   A page of setup notes: travel router, static IP, iPad URL, Guided Access.
   The trolley card is that URL, written once, taped on. You do not generate
   a PDF card unless it is cheaper than the notes page — notes page is enough.

════════════════════════════════════════
NOT YOUR JOB
════════════════════════════════════════

  Owner: Phase 0 on an iPad (does this Wi‑Fi reach the laptop). Static IP on
         the router. Tape the card. Send the three drone-team questions.
         Read ADR-0035. Rotate the Cloudflare token that was pasted in chat.
  Drone team: does anything come back, what does a packet look like, fixed ids.
  QA: docs/plans/2026-08-21-qa-full-web-app.md after you land 1–3.

  Do not start the 340 open feature tickets.
  Do not implement Land/Stop to hardware.
  Do not put live altitude/battery/position in the database.

════════════════════════════════════════
HOW TO COMMIT
════════════════════════════════════════

Conventional commits, one logical change each. If the subject needs "and",
it is two commits. Closes nothing that is not actually closed.
Update docs/CHANGELOG.md, docs/DECISIONS.md, CLAUDE.md Gotchas for anything
non-obvious.

Prove Done A from the plan before you call it complete:

  [ ] Double-click on a laptop that has never run it (or the zip).
  [ ] Settings shows Simulator, class flies.
  [ ] Seed fills a Lesson; all twelve steps open with content.
  [ ] Phone on the same network joins with the code.
  [ ] Cable out, it carries on.
  [ ] Step 11 seals; step 12 debrief.
  [ ] Records: class list and one child.
  [ ] Save a copy of my records → Desktop file.

Open one PR (or finish #672 then one follow-up PR) that says which of 1–6
are done and which you consciously left, and why.
```
