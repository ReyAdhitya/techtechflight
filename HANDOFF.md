# Handoff — 2026-07-28

Written so a fresh agent can pick this up without re-deriving it. Read this, then
`docs/plans/2026-07-27-board-corrections.md`, then `CLAUDE.md`.

## What this session was

A product owner reviewed the running board and gave a list of corrections. They were
turned into GitHub issues, built one at a time by a separate engineer terminal, and
reviewed once. The repository was also made public, which required cleaning six personal
documents out of the whole history first.

Nothing here is speculative. Every issue below is written to be executed without asking
the planner a follow-up question.

## Where the work is

**Current branch: `fix/section-descriptions-full-width`** — 62 commits above `main`.

The branches are a **stack**, not parallel work. Each was cut from the one above it, so the
newest contains everything:

```
main
 └─ fix/scope-fixed-window                     #9 #16 #17 #18
     └─ fix/end-lesson-contrast                #12
         └─ chore/remove-records-and-keyboard-panels   #14
             └─ feat/xyz-on-every-strip        #10
                 └─ fix/under-observation-label #11
                     └─ feat/scope-side-view    #19
                         └─ fix/drop-phase-word-from-strip  #20
                             └─ feat/professional-register  #13
                                 └─ fix/section-descriptions-full-width  #21  ← HEAD
```

**Merging the tip merges everything.** Do not merge the middle branches separately.

All are pushed to `origin`. `main` is untouched and still shows the pre-correction board.

## State of the gate

`npm test` — 427 passing, up from 389 at the start. `npm run typecheck` clean.

There is no lint and no other gate (`CLAUDE.md`). Both must pass before anything merges.

## Issues

Closed in code, open on GitHub (nothing is merged yet, so nothing was closed):

| # | What | Done |
|---|---|---|
| 9 | Scope: hold the grid still, square half-metre cells | ✅ |
| 16 | Cap the scope at 600px, centre on the Fleet, fix label overlap | ✅ |
| 17 | Clear the review findings from #9 | ✅ |
| 18 | Show altitude on the scope, drop the grid scale caption | ✅ |
| 12 | Give "End the lesson" the contrast of a primary control | ✅ |
| 14 | Remove "Your records" and the Keyboard panel | ✅ |
| 10 | Show X, Y and Z on every flight strip | ✅ |
| 11 | "Keep an eye on it" becomes "Under observation" | ✅ |
| 19 | A side view on the scope, toggled with the top-down | ✅ |
| 20 | Drop the phase word from the flight strip | ✅ |
| 21 | Let the section descriptions use the width their surface has | ✅ |
| **15** | **Read real Drones over MAVLink, developed against SITL** | ❌ **not started** |

**#15 is the only substantial work left**, and it is the product owner's original request —
connecting the board to real drones. It is independent of everything above and touches no
file the others open.

## What remains, in order

1. **One code review over the whole stack**, not per issue. The owner explicitly wants it
   last, once, before merging.
2. **Merge the tip branch into `main`.** Nothing has been merged; the public repository
   still shows the old board, and GitHub's contribution graph counts only `main`.
3. **#15** whenever it is wanted. Approach is fully specified in the issue: MAVLink over
   UDP against ArduPilot SITL, in a new `fleet-adapters/` workspace.

Every board correction the product owner asked for is built. Only #15 is outstanding, and it
is a project rather than a correction.

## Rules that are not obvious and cost real time when broken

**The engineer stops or carries on by one test.** One sensible fix for a plain defect →
build it and say so in a comment. Several defensible fixes that look different on screen →
stop and ask. The first version of this rule said stop always, and it cost a round trip on
a scope height that had exactly one answer.

**Five words are contract, not copy.** `'Offline' | 'Ready' | 'Not Ready' | 'Flying' |
'Fault'` are the TypeScript type, the wire format and the display text at once, across four
workspaces and inside stored lesson records. The professional-register sweep (#13) was
written around them deliberately.

**`ServiceState`'s `'watch'` key is serialized** in the browser logbook. #11 changed its
label only. Renaming the key silently invalidates every stored service decision.

**jsdom cannot see layout.** A broken aspect ratio or an off-screen strip passes green.
Every visual change needs `node scripts/shot.mjs <label> <route> <width>` — build first, and
run it from PowerShell, since Git Bash rewrites a bare `/route` into a Windows path.

**The product is English.** Recorded in ADR-0015. The team speaks Indonesian; it never
reaches the product.

**Six personal documents were removed from the entire history** on 2026-07-28 before the
repository went public — `NOTES.md`, `MISSION.md`, `RESOURCES.md`, `lessons/`,
`learning-records/`, `reference/`. They exist in the working copy and are gitignored,
anchored to the root. The six product decisions `NOTES.md` carried survive in
`docs/DELIBERATE-POSITIONS.md`. Do not restore any of them to the repository.

## New documents from this session

- `docs/plans/2026-07-27-board-corrections.md` — the full plan, including the three-terminal
  working agreement and the commit convention
- `docs/DELIBERATE-POSITIONS.md` — six board decisions that look like defects and are not
- `docs/adr/0014-a-fixed-scope-window.md` — why the scope window is a display property and
  not the flight area ADR-0012 defers
- `docs/adr/0015-a-professional-register.md` — the register conversion, superseding
  `CONTEXT.md`'s education-first rule
- `docs/adr/0016-a-side-view-on-the-scope.md` — the elevation view and its ground line

## How the terminals work

Three roles, coordinated through GitHub issues (`docs/agents/issue-tracker.md`):

- **Planner** — reads code, writes specs, files issues, never writes production code
- **Engineer** — claims one issue, one branch, implements, commits small
- **Review** — runs `/code-review`, comments only, never commits

One issue, one branch, one terminal. A spec disagreement goes in the issue as a comment,
never quietly into the diff.

Commits are conventional-prefixed with a friendly specific subject, one logical change each.
The test is whether the subject needs the word "and" — if it does, it is two commits.
