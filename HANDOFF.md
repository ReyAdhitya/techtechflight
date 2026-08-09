# Handoff, 2026-08-06

Written so a fresh agent can pick this up without re-deriving it. Read this, then
`CLAUDE.md`, then the issue tracker.

Everything in the "Where it stands" and "What is actually left" sections was checked
against the repository on 2026-08-06, not remembered. Where something is a judgement
rather than a fact it says so, so it can be overturned deliberately rather than by
accident.

This file replaces the 2026-07-28 handoff, which described a stack of branches that has
since merged. The rules from it that are still true are carried forward below.

## The product in one paragraph

A ground station for a school teacher running a class of drones. The Teacher drives a
laptop; the Students fly by hand with controllers and read a tablet. The customer supplied
two twelve-step workflow posters, one per side, and they mirror each other: the Teacher
grants a takeoff at their step 6 while the Student asks for it at their step 5. The product
is those two posters made real.

Owner's goal, in their words: easy, tidy, few words, straight to the point, and guided
without being confusing.

## Where it stands

`main` is at `c4a56ba`. Merged today:

| PR | What |
|---|---|
| #650 | the Student app on one machine (ADR-0025) |
| #651 | one-page Lesson, live Control ATC, iPad classroom join |
| #647 | the Lesson screen answers one question |
| #646 | the Lesson screen stops offering two of everything |
| #652 | OPEN, not merged: stop rebuilding the whole board on every page load |

Live and verified in production: the Teacher's twelve steps end to end, and the Student app
as far as "Ask to take off" and the waiting copy.

## What is actually left

Audited against the code on 2026-08-06, not against the older plan.

| Item | State on 2026-08-06 | Evidence |
|---|---|---|
| Sealed Mission reaches Reports (#635) | done | `putMissionOnLesson` in `web/lib/logbook.ts`, called at `ControlScreen.tsx:619`, covered by `web/lib/sealed-mission-reaches-reports.test.tsx` |
| The classroom session seam (#638) | done | `web/lib/classroom-session.ts` plus its test |
| A door for each of the two people (#637) | done | `web/lib/role.ts`, `web/app/enter/page.tsx`, `web/components/RoleGate.tsx` |
| Student steps 1 to 12 (#639 to #643) | done on one screen | `web/components/StudentMissionScreen.tsx`, 1092 lines |
| Record the two-audience app (#645) | done | `docs/adr/0025-the-student-screen-is-a-second-audience-not-a-second-board.md` |
| Em dashes in on-screen copy (#621) | done for copy, not for comments | one em dash left outside a comment in the whole of `web/components` and `web/app`, and it is inside a JSX comment in `showcase/DroneModel.tsx`. 134 non-test component files still carry em dashes in JSDoc |
| Large format is icon only (#623, half of it) | already shipped | `DisplayScaleToggle.tsx` is icon only with a `title` tooltip |
| `/api/classroom` reachable from the ground station (#644) | **not done, and it is the blocker** | `api/classroom.ts` is a Vercel function at the repo root. `ground-station/src/server.ts` serves `/api/classroom-setup` only. `web` builds `output: 'export'`, so it has no route handlers at all |
| Ground station prints its LAN address | not done | `ground-station/src/main.ts:122` prints `http://localhost:${port}` only |
| "Classroom ready" screen for the Teacher | not done | no component answers "what do I read out to the class" |
| Windows Firewall rule in the launcher | not done | `Start TechTech Flight.bat` does not add one |
| Hold a takeoff, not only grant it (#636) | done | `holdClearance` in `web/lib/clearance.ts`, Hold beside Grant on `ClearanceQueue` |
| Fleet headcount check removed (#624) | done | component, lib and tests deleted 2026-08-09 |
| `?step=` still read on Lesson (#648) | done | `/lesson` forwards; `?step=` is read on `/mission` alone |
| `text-caption` has no token (#649) | done | `--text-caption: 1rem` in `globals.css`, pinned by `web/type-scale.test.ts` |
| `StepRail` is orphaned | judgement, no issue yet | `web/components/StepRail.tsx` exists and nothing imports it but its own test |
| Vision moved out of the main nav | not done | `web/app/(app)/vision` is still a route |
| One Room menu for Lit room, Large format, Walls | not done | still separate header controls |
| Prose budget test | not done | nothing asserts a word count on screen copy |

Issues #635 to #645 are largely delivered by PRs #650 and #651. Walk that list and close what
shipped, or every plan written on top of the backlog will be wrong.

### The one that decides a demo

`/api/classroom` exists only as a Vercel function. A classroom running off the laptop
launcher serves the board from the ground station on `:4321`, and that server has no
`/api/classroom` route. `classroomApiUrl()` in `web/lib/classroom-session.ts` can be pointed
elsewhere, but only through `NEXT_PUBLIC_CLASSROOM_SYNC_URL`, which is a build seed and so
is not set in the launcher build. `logbookSyncUrl()` has a `localStorage` override for
exactly this reason and the classroom one does not.

Consequence: iPads joining across the room work against the Vercel deploy and do not work
against the classroom laptop. On one machine, `localStorage` plus `BroadcastChannel` still
works, which is why this reads as fine in a single-browser test.

## Decisions that should not be re-litigated

**Students never get a Command.** Land, Hover, Recall and Stop belong to the Teacher, always
(ADR-0011, ADR-0021). Students fly by hand; the Student tablet has exactly two pressable
things, Ask to take off and Understood. This is also the safety story to a school: no child
can press anything that moves an aircraft.

**No invented readings.** An absent reading is said in words, never a zero or a dash dressed
as live. The first Student screen printed `value="On craft"` where a figure belonged, and
that is part of why the owner reverted it eight minutes after merging.

**Phases derive from records and Telemetry, never from a button.** A Student cannot mark
themselves airborne; `flownAt` is the first sighting off the ground.

**No GPS.** There is none in this product, deliberately. Position is metres from the Fleet's
own origin (ADR-0019). No map tile, no GPS icon, even though the customer poster shows one.

**The Attention bar stays pinned above every Control step**, rather than living only on step
10. An alert arriving while a Teacher reads the Scope has to be visible where they are
looking, and children are flying. This is a deliberate deviation and the owner has not ruled
on it.

**Large format is not deleted, and the room controls keep their text.** Judgement, and it is
in live conflict with issue #623, which asks for icons only and for Large format to go. Half
of #623 has shipped already: `DisplayScaleToggle` is icon only today. Settle the other half
with the owner before touching it.

## Hazards

**Two terminals share one working directory.** This is the biggest operational risk and it
cost real time: six commits landed on the wrong branch, a branch was switched mid-push, and
two agents wrote the same file within minutes of each other. Use separate git worktrees.

**The em dash sweep broke a build once.** `898af04` swept dashes and middots from on-screen
copy, `541c9be` repaired `DroneScreen` afterwards, and `dfebeb3` records a deploy blocker.
Read all three before continuing. Rewrite sentences; do not delete characters.

**`ControlCameraSlide.test.tsx` "dismisses the popup on Escape" is flaky.** Passes alone,
fails in the suite, and nobody has touched that file recently. It did not reproduce on
2026-08-06, when the full suite ran green at 1421 tests across 232 files in 110 seconds, so
it is intermittent rather than broken. Needs its own ticket, not a ride-along fix.

**Three things no commit can settle, and they are the owner's:**

1. **Which drone the school buys.** Pixhawk or ArduPilot works with the MAVLink adapter that
   exists. DJI, including Tello, does not speak MAVLink and needs its own adapter. This also
   decides the network: a Wi-Fi drone and a Wi-Fi tablet may not share one card.
2. **A tablet on the school network.** School networks block devices from seeing each other.
   Fifteen minutes of testing now, or a failed demo. Not fixable in code.
3. **One real lesson.** Nothing here has been used by a teacher with a class. Every "done"
   so far means the screens look right.

## How the code is arranged

The twelve-step model, still present:

```
web/lib/mission-flow.ts        done / current / live / locked
web/lib/mission-flow-*.ts      the marks
web/components/StepRail.tsx    the rail, now imported by nothing but its own test
web/app/globals.css            the base and the slide
```

The screens:

```
LessonScreen.tsx           Mission set-up: Scenario picker, MissionAreaEditor,
                           TeamsPanel, MissionBriefing
ControlScreen.tsx          steps 6 to 11: ClearanceQueue, Scope, FlightStrip,
                           Attention, ConfirmMissionComplete
ReportsScreen.tsx          the report
StudentMissionScreen.tsx   all twelve Student steps on one screen
```

Where state lives:

```
web/lib/mission.ts             the Mission type
web/lib/mission-draft.ts       techtechflight:mission-draft, the working copy
web/lib/logbook.ts             the Lesson record and the roster
web/lib/clearance.ts           the clearance shape
web/lib/clearance-store.ts     where clearances are kept
web/lib/classroom-session.ts   seats, phases, instructions
web/lib/incident-playbook.ts   what to do, by safety priority
api/classroom.ts               the Vercel function, Blob backed
api/logbook.ts                 the Vercel function, Blob backed
ground-station/src/server.ts   :4321, serves /api/classroom-setup and the board
```

Read `CLAUDE.md` before changing anything. Its Gotchas section is the accumulated list of
what is not obvious from the code, and it is kept current.

## Working rules in this repository

- `npm test` and `npm run typecheck` are the whole CI gate. There is no lint. Run them at
  every commit.
- Semantic colour tokens (`bg-canvas`, `text-ink-subtle`, `border-hairline`), never the
  shadcn base layer. A `px` font-size is a defect (ADR-0008).
- No em dashes in copy a Teacher reads. The owner reads them as machine-written.
- jsdom has no layout. Assert on `globals.css`, and look at a screenshot before believing a
  visual claim. `scripts/shot.mjs <label> <route> <width>` serves `web/out`, so build first,
  and pass routes from PowerShell.
- Conventional commits. Rebase rather than squash so every commit lands on `main`; the owner
  wants the history dense.
- After a merge, fetch and read the strings actually shipped. A green deploy is not evidence.
- Windows: `next build` fails with `EBUSY` if a shell sits in `web/out`.
- **Five words are contract, not copy.** `'Offline' | 'Ready' | 'Not Ready' | 'Flying' |
  'Fault'` are the TypeScript type, the wire format and the display text at once, across four
  workspaces and inside stored lesson records.
- **`ServiceState`'s `'watch'` key is serialized** in the browser logbook. Renaming the key
  silently invalidates every stored service decision.
- **The product is English.** The team speaks Indonesian; it never reaches the product.
- **Six personal documents were removed from the entire history** on 2026-07-28 before the
  repository went public: `NOTES.md`, `MISSION.md`, `RESOURCES.md`, `lessons/`,
  `learning-records/`, `reference/`. They exist in the working copy and are gitignored. Do
  not restore any of them to the repository.

## How the terminals work

Three roles, coordinated through GitHub issues (`docs/agents/issue-tracker.md`):

- **Planner** reads code, writes specs, files issues, never writes production code
- **Engineer** claims one issue, one branch, implements, commits small
- **Review** runs `/code-review`, comments only, never commits

One issue, one branch, one terminal, and from now on one worktree. A spec disagreement goes
in the issue as a comment, never quietly into the diff.

## Companion documents

- `docs/DELIBERATE-POSITIONS.md`, six board decisions that look like defects and are not
- `docs/adr/`, why each decision was made
- `docs/POSTER-WORKFLOW-PLAN.md`, the two posters as a plan

## If you do only one thing

Walk issues #635 to #645, close what shipped, and reissue the remainder as a short honest
list. The backlog currently overstates what is left.
