# What is actually left, 2026-08-06

Planner output. Every verdict below was checked against the code on `main` at `c4a56ba`
today. Nothing here is inferred from the old backlog.

> **The priority order here is superseded by
> [`2026-08-07-rail-rebuild-handover.md`](./2026-08-07-rail-rebuild-handover.md).**
> R1, the ground station `/api/classroom` gap, is not a blocker for the owner's demo,
> which runs on the Vercel deploy. It stays true for a real classroom. The triage of the
> issues below is still accurate.

## Part 1: triage of the open backlog

### Close, delivered

| # | Title | Evidence on `main` |
|---|---|---|
| 622 | Step 1 carries the whole Lesson admin panel | `LessonScreen.tsx` is five sections: Scenario, Area, Teams, Pre-flight, Brief. No admin panel, no step gate |
| 627 | Teacher or Student at the door | `web/app/enter/page.tsx`, `web/components/RoleGate.tsx`, `web/lib/role.ts` |
| 629 | Student Mission workflow, 12 steps | `web/components/StudentMissionScreen.tsx`, all twelve on one screen |
| 630 | Teacher spine: one Start, Control is one board | `ControlScreen.tsx` has no `?step=` gating; ADR-0024 superseded |
| 635 | A sealed Mission never reaches Reports | `putMissionOnLesson` in `logbook.ts`, called at `ControlScreen.tsx:619`, covered by `sealed-mission-reaches-reports.test.tsx` |
| 637 | A door for each of the two people | same as 627, this pair is a duplicate |
| 638 | The classroom session seam | `web/lib/classroom-session.ts` plus its test |
| 639 | Student steps 1 to 4 | `StudentMissionScreen.tsx` |
| 640 | Student step 5, request takeoff | `StudentMissionScreen.tsx`. Note the Teacher half is only half built, see R3 |
| 641 | Student steps 6 to 8 | `StudentMissionScreen.tsx` |
| 642 | Student step 9, instructions | `StudentMissionScreen.tsx` |
| 643 | Student steps 10 to 12 | `StudentMissionScreen.tsx` |
| 645 | Record the two-audience app | `docs/adr/0025-...md` |

Close 627 and 637 as one, keeping whichever has the better thread.

### Close with a note

| # | Title | Why |
|---|---|---|
| 621 | No em dashes in anything a Teacher reads | Done for the thing the issue asked for. Exactly one em dash survives outside a comment in `web/components` and `web/app`, and it is inside a JSX comment in `showcase/DroneModel.tsx`. The 134 files that still carry em dashes carry them in JSDoc, which no Teacher reads. Close it and open R7 if the owner wants the comments swept too, which is a different and much lower value job |

### Keep open, rewritten

| # | Title | What is actually left |
|---|---|---|
| 628 | Classroom code syncs Teacher board to Student phones | Works against the Vercel deploy. Does not work against the classroom laptop, which is the only place a real lesson runs. Becomes R1 |
| 636 | Hold a takeoff, not only grant it | Untouched. `ClearanceQueue` offers Grant only, no `holdClearance` exists. Becomes R3 |
| 644 | Reach the Teacher across the room | The polling half exists in `classroom-session.ts`. The server half does not. Folds into R1 |
| 624 | Fleet screen: drop the headcount check | Untouched, `FleetHeadcountCheck.tsx` still exists. Becomes R6 |
| 625 | The board is not usable on a phone or a tablet | The Student half is answered by ADR-0025. The Teacher board on a tablet is untouched. Narrow it to the Teacher board or close it |
| 648 | `/lesson` opens on step 5 with an empty board | `web/app/(app)/lesson/page.tsx:12` still reads `?step=`. Becomes R5 |
| 649 | `text-caption` has no token | Confirmed. No `text-caption` rule in `globals.css`; 20 files use the class. Becomes R4 |

### Needs an owner ruling before any code

| # | Title | The conflict |
|---|---|---|
| 623 | Header: icons only, and Large format goes | Half of it already shipped: `DisplayScaleToggle` is icon only today. The other half, deleting Large format, contradicts the guidance given after the issue was filed: a Teacher at the back of the room cannot read the board, and a tooltip does not help someone standing up. Ask the owner to pick, then either close 623 or file the deletion |

## Part 2: the reissued list, in the order that matters

Ordered by what decides whether a lesson can be taught, not by size.

### R1. The classroom code has to work on the classroom laptop

**Why first.** This is the only item on the list that stops a real lesson happening. A class
runs off `Start TechTech Flight.bat`, which serves the board from the ground station on
`:4321`. `api/classroom.ts` is a Vercel function at the repo root and the ground station
serves `/api/classroom-setup` only. `web` builds `output: 'export'`, so it has no route
handlers of its own. iPads therefore join against the Vercel deploy and not against the
laptop in the room. On one machine `localStorage` plus `BroadcastChannel` still works, which
is why this reads as fine in a single-browser test and fails in a classroom.

**Scope.**
1. `ground-station/src/server.ts` serves `GET` and `PUT /api/classroom`, same request and
   response shape as `api/classroom.ts`, backed by memory or a file rather than Blob. The
   ground station is the classroom's server, not a cache of Vercel's.
2. `classroomApiUrl()` in `web/lib/classroom-session.ts` gains a `localStorage` override the
   way `logbookSyncUrl()` already has one, because `NEXT_PUBLIC_CLASSROOM_SYNC_URL` is a
   build seed and the launcher build cannot set it.
3. Tests beside `server.test.ts`, which already covers `/api/classroom-setup` and shows the
   pattern.

**Out of scope.** Blob, auth, and any change to the session shape.

### R2. Get an iPad into the room without a network expert

Three small pieces, one issue, because they are the same five minutes of a Teacher's day.

1. `ground-station/src/main.ts:122` prints `http://localhost:${port}` only. Print the LAN
   address from `os.networkInterfaces()` beside it, IPv4, non internal.
2. A "Classroom ready" screen for the Teacher: the address to type and the classroom code to
   read out, in large type, and nothing else. This is the screen that does not exist yet, and
   without it a Teacher has to be told what to do by a person who knows.
3. `Start TechTech Flight.bat` adds the Windows Firewall rule for the port, or says in one
   line what to click when it cannot.

**Known limit to print on that screen, not hide.** `getUserMedia` is refused on a plain
`http://` LAN address, so the camera will not work for a Student who joined that way.
`/vision` already says this; the classroom screen should say it too.

### R3. Hold a takeoff, not only grant it

Both posters say grant or hold. `grantClearance` has no counterpart and `ClearanceQueue`
renders one button. Add `holdClearance`, render both, and make the Student's step 5 print the
held answer in words. A hold is a record, never a Command (ADR-0021). Was #636.

### R4. `text-caption` is used and has no token

20 files set a class that `globals.css` never defines, so those captions inherit whatever
they inherit. Either add the token or delete the class from all 20. Adding it is the smaller
diff and the one that matches ADR-0008, but the size must come from `docs/DESIGN-TOKENS.md`
and not from taste. Was #649.

### R5. Lesson still reads `?step=`

ADR-0024 is superseded and Lesson is one scrolling page, but `web/app/(app)/lesson/page.tsx`
still reads a step out of the URL on the client. Delete the read and the Suspense boundary
it needs. Check `StepRail.tsx` in the same pass: nothing imports it but its own test, so it
and `mission-flow-*.ts` should either be deleted or documented as facts kept on purpose.
Deleting a component the poster plan may want back needs one line in `DECISIONS.md`. Was
#648.

### R6. Fleet headcount check

`FleetHeadcountCheck.tsx` is still on the Fleet screen. The owner asked for it gone in #624
and nothing has happened. Confirm the ask still stands, then delete the component, its
tests, and `fleet-headcount.ts` if nothing else reads it.

### R7. Housekeeping, only if asked

- Em dashes in JSDoc, 134 files. No Teacher reads them. Low value, large diff, high risk
  given `898af04` broke a build doing exactly this to copy.
- A prose budget test, asserting a word count on the screens where "few words" is the
  product. Worth doing, needs the owner to say what the budget is.
- Move `/vision` out of the main nav.
- One Room menu holding Lit room, Large format and Walls. Blocked on the #623 ruling.

### R8. Flaky test, its own ticket

`ControlCameraSlide.test.tsx`, "dismisses the popup on Escape". Passes alone, fails in the
suite, untouched recently. Do not let it ride along inside another issue; a flaky test that
is somebody's side quest never gets fixed.

## Part 3: the three the owner has to settle

No commit can answer these and every plan built on top of them is provisional.

1. **Which drone the school buys.** Pixhawk or ArduPilot works with the MAVLink adapter that
   exists. DJI, Tello included, does not speak MAVLink and needs an adapter written. This
   also decides the network, because a Wi-Fi drone and a Wi-Fi tablet may not share one card.
2. **A tablet on the school network.** School networks routinely stop devices seeing each
   other. Fifteen minutes of testing now, or a failed demo. R1 and R2 are worthless if this
   answer is no.
3. **One real lesson with a real class.** Nothing here has been used by a teacher. Every
   "done" above means the screens look right.

## Working agreement for the next wave

One issue, one branch, one terminal, **one git worktree**. Two terminals in one working
directory already cost six commits on the wrong branch and two agents writing the same file
minutes apart.
