# The tracker sweep, 2026-08-18

389 issues were open. Three sampled at random — #628, #640, #636 — were all already shipped,
which is why a wave in this repo rebuilt four items that were already on main. Work had been
shipping and nothing had been closed.

**Each verdict below was judged against the code, not against what the issue claims**, and each
closure carries the line naming where the thing lives now. A grep proves existence, not
correctness: **a shipped thing that is wrong is a new issue, never an old one left open.**

## Closed: 19

| # | Where it lives now |
|---|---|
| 649 | `--text-caption` in `web/app/globals.css`, with `web/type-scale.test.ts` refusing any `text-*` with no token |
| 644 | `pushClassroomInstruction` in `web/lib/classroom-session.ts` |
| 643 | `BackOnTheGround` and the sealed score, `web/components/StudentMissionScreen.tsx` |
| 642 | the instruction takeover, gated on `instructionWaiting` in `web/lib/student-steps.ts` |
| 641 | the flying screen, `RedZoneTakeover`, `reachedCheckpointIds` |
| 640 | `requestTakeoff` in `web/lib/classroom-session.ts` |
| 639 | `MissionBrief` through `WhichDroneAreYouHolding` |
| 638 | `web/lib/classroom-session.ts`, keyed on `CLASSROOM_SESSION_KEY` |
| 637 | `RequireRole` in `web/components/RoleGate.tsx` |
| 636 | `holdClearance` in `web/lib/clearance.ts` |
| 635 | `web/components/MissionReport.tsx` reads the sealed outcome |
| 630 | `web/components/MissionRunScreen.tsx` |
| 629 | `STUDENT_STEPS` in `web/lib/student-steps.ts` |
| 628 | `mintClassroomCode` and `loadClassroomByCode` |
| 627 | `web/components/RoleGate.tsx`, the address decides the role for a tab |
| 625 | the `46rem` breakpoints, with `web/scroll-containers.test.ts` behind them |
| 624 | `FleetAllWellLine` |
| 622 | `StepRail` carries steps 1 to 5; step 1 lost the admin panel |
| 616 | `awaitingClearance` in `web/lib/clearance.ts` |

## Kept: 2

| # | What is missing today |
|---|---|
| 623 | **Not shipped, and the sweep caught it.** `DisplayScaleToggle.tsx` and `display-scale.ts` are both still in the tree and the header still mounts the toggle. It was removed on a branch whose PR was closed unmerged, so nothing landed. Labelled `ready-for-agent` |
| 648 | No code decides an opening step for `/lesson` from the records, so the report is unexplained rather than fixed. Labelled `needs-info`, wants a repro against current main |

## Unclear: 368, and this is the honest number

**The sweep is partial and stopped deliberately.** The 368 issues below #616 were not judged.
Two reasons, and neither is a shortage of time alone:

- **The automated first pass produced wrong verdicts and was thrown away.** Grepping for a
  symbol named in a title marks "remove Large format" as shipped the moment `ThemeToggle`
  exists nearby. Polarity is the whole problem: an issue asking for a thing to *go* is proved
  by an absence, and an issue asking for a thing to *arrive* by a presence. Nothing in a title
  says which. Every verdict above was therefore checked by hand with the direction chosen
  first, and #623 is the one that flipped.
- **Judging 368 by hand at two minutes each is twelve hours**, and the sweep exists to stop
  waste rather than to become the week.

The 19 closed are the ones most likely to be rebuilt, because they are the most recent and
describe work that landed in the last fortnight. That was the failure this sweep was called to
stop, and it is stopped.

### How to finish it

The remaining issues fall into recognisable runs — the `[18] 4xx` series is a bulk import of an
older backlog and is the biggest single block. Take them a run at a time, decide the polarity
before opening the code, and close with the line naming the artefact. Anything that takes more
than two minutes gets `needs-info` and is moved past.
