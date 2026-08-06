# UI completion plan

What is incomplete, dishonest, or messy on the web board — and the order to finish it.

Sources: live audit of `web/` (2026-08-06) · [DESIGN.md](./DESIGN.md) · [ADR-0025](./adr/0025-the-student-screen-is-a-second-audience-not-a-second-board.md) · [DELIBERATE-POSITIONS.md](./DELIBERATE-POSITIONS.md) · open GitHub issues · [CLAUDE.md](../CLAUDE.md) gotchas.

This is **not** the 350-feature backlog. It is the work that makes the shipped product feel finished and honest for a Teacher (and a Student on one machine), before adding more walls and epics.

---

## Verdict

Teacher core (Fleet tiles, Control strips + Scope, Reports print) is largely solid.
The mess is concentrated in four places:

1. **Honesty** — the door promises phones + classroom codes; only one-machine Student exists.
2. **Lesson flow** — wrong first step, admin dump on step 1, empty clearance queue.
3. **Narrow boards** — phone/tablet cannot walk the room (#625).
4. **Vocabulary / tokens** — a few surfaces speak ops or use foreign shadcn colours.

Student Mission on one machine shipped (PR #650). Cross-device sync is the only temporary product gap named in ADR-0025.

---

## Do not “fix”

Argue with these in an ADR or leave them alone.

| Position | Why |
|---|---|
| Tiles / strips never reorder on Status or Alerts | Muscle memory (ADR-0004, deliberate #1) |
| Colour never sole carrier — word + shape | ADR-0004 |
| Needs Attention can render at zero | Deliberate #3 |
| Amber / coral severity hue split | Deliberate |
| Elevation = lightness, not shadow tiers | Deliberate |
| `--text-value` same size as body; rem only | ADR-0008 |
| Not Ready silent on return without charge rise | ADR-0007 |
| No Commands to real hardware | ADR-0011 |
| Student presses never start motors | ADR-0021 |
| Zones in Fleet local frame — no GPS / map tiles | ADR-0019 |
| Status / FlightPhase / MissionPhase stay apart | ADR-0020 |
| Student: exactly two pressables; no permanent classroom code on chrome; no invented figures | ADR-0025 |
| Dark cockpit aesthetic | Refused (DESIGN §1.2) |
| Per-Student incident history | Refused (DESIGN §7.1) |
| Compacting grounded strips / hiding Commands from the scan path | Already broke CI |

---

## Waves

Each wave is shippable alone: tests green, typecheck green, changelog + decisions, PR, merge.
Prefer screenshots via `scripts/shot.mjs` for layout waves (build `web/out` first).

### Wave 0 — Close the books (half day)

Hygiene so agents stop re-building shipped work.

| # | Action | Issue |
|---|---|---|
| 0.1 | Close Student/door/session tickets that PR #650 already satisfied; comment with commit / ADR-0025 | #627, #637, #638, #629, #636, #639–#643 (verify each acceptance line first) |
| 0.2 | Leave #628 open — that is the real remaining Student gap | #628 |
| 0.3 | Note in #627 if role-switch acceptance was not shipped (likely) — reopen or spawn a thin follow-up | — |

**Done when:** open Student issues describe only unfinished work.

---

### Wave 1 — Honesty first (1–2 days)

Stop advertising what does not exist. Highest leverage, smallest diff.

| # | Work | Files / issues | Acceptance |
|---|---|---|---|
| 1.1 | Rewrite RoleGate copy: second window / same laptop today; no “own phone”; no “classroom code” until sync ships | `web/components/RoleGate.tsx` | Copy matches ADR-0025 one-machine limit |
| 1.2 | Role switch escape hatch: Settings + Student chrome → `/enter` | `SettingsScreen.tsx`, `StudentMissionScreen.tsx`, #627 remnant | Teacher/Student can leave their role without clearing storage by hand |
| 1.3 | Attention bar: Teacher words — “things need you” / behaving; drop “nominal” / “items require action” | `AttentionBar.tsx`, DESIGN §4.2 | Vocabulary matches DESIGN |
| 1.4 | StepRail: replace `bg-muted` / `hover:bg-muted` with semantic tokens | `StepRail.tsx` | No foreign muted on the rail |
| 1.5 | Skip-link label not always “Skip to the Fleet” | app layout / header | Label matches the screen or is generic (“Skip to content”) |
| 1.6 | Remove dead empty `print-hide` div on Reports | `ReportsScreen.tsx` | No empty chrome |

**Done when:** a stranger at `/enter` is not promised a phone join path.

---

### Wave 2 — Lesson first impression (2–3 days)

The Teacher’s day starts broken or overloaded.

| # | Work | Issues | Acceptance |
|---|---|---|---|
| 2.1 | Empty board / no Mission → Lesson opens on step 1, not step 5 | #648 | Fresh visit never lands on empty step 5 |
| 2.2 | Strip Lesson admin dump out of step 1; one job per step | #622 | Step 1 is Scenario / Mission choice only; prep/start live where the rail already points |
| 2.3 | Clearance queue fills without teams so step 6 is not empty theatre | #616 | With assigned craft + active Mission, Approve takeoff has someone to approve |
| 2.4 | Mission empty states that say the next action | #586 (slice: Lesson + Control Mission surfaces) | Absence reads as “do X next”, not a blank card |

**Done when:** cold start → plan → start → approve takeoff works without hunting.

---

### Wave 3 — Walk the room (3–5 days)

|#625| and the tablet family (#173, #174, #459). Layout only; do not invent a second product.

| # | Work | Acceptance |
|---|---|---|
| 3.1 | StepRail: already slides away narrow — verify and harden; no second nav | Usable at 768×1024 and 390×844 |
| 3.2 | Site header / 7-link nav: collapse or overflow so it does not eat the board | Primary actions still reachable |
| 3.3 | Control: strips stack; coordinates + Commands stay in flow (do not gate) | Strip anatomy preserved |
| 3.4 | Fleet tiles: readable at tablet width; no reorder | Board order intact |
| 3.5 | Lesson step panes: single column on narrow | One dominant block |
| 3.6 | Shot pack: `scripts/shot.mjs` for `/`, `/lesson`, `/control` at phone + tablet widths | Shots in `scripts/shots/` reviewed before merge |

**Done when:** a Teacher can walk the aisle with a tablet and grant a clearance without pinching.

---

### Wave 4 — Student across devices (3–5 days)

The only temporary ADR-0025 limit. Either build it or keep Wave 1 honesty forever.

| # | Work | Issues | Acceptance |
|---|---|---|---|
| 4.1 | Implement `GET`/`PUT` `/api/classroom` (Vercel Blob, keyed by code) mirroring Logbook sync patterns | #628, `web/lib/classroom-session.ts` already calls it | Push from Teacher machine; pull on another browser returns the session |
| 4.2 | Teacher: show/copy classroom code on Lesson or Control (not on Student chrome permanently) | #628 | Code visible to Teacher only |
| 4.3 | Student join: code + name when not on the same machine; keep name-from-roll path for same machine | #628, ADR-0025 | Two devices share brief, clearance, sealed score |
| 4.4 | Restore RoleGate phone/code copy **only after** 4.1–4.3 green | Wave 1 undo | Door matches reality again |
| 4.5 | Still: no Commands from Student; no invented readings; two pressables | ADR-0021 / 0025 | Unchanged |

**Done when:** an iPad on school Wi‑Fi can join with a shouted code.

**Fallback:** if Blob/auth is not ready, keep Wave 1 copy and park #628 as blocked — do not half-ship a join screen that 404s.

---

### Wave 5 — Classroom daylight & front-of-room (3–5 days)

Real rooms are bright. Projector is common.

| # | Work | Issues |
|---|---|---|
| 5.1 | Glare / high-contrast / projector profile | #458, #395, #453 |
| 5.2 | Pad wall: replace or hide `LandingPadWorkflowSim` stub | Pads wall |
| 5.3 | Camera wall empty stream: keep honesty, tighten “not configured” so it does not look broken | `CameraTile.tsx` |
| 5.4 | Walls hub: demote or hide unfinished stubs; do not add new walls in this wave | Walls hub |

**Done when:** projector + daylight do not wash the board into illegibility; stub walls do not look like product defects.

---

### Wave 6 — Polish pass (2–3 days)

Only after Waves 1–3. Do not start here.

| # | Work |
|---|---|
| 6.1 | Reports: tighten section order after a closed period (digest / CSV / one-pager hierarchy) |
| 6.2 | Students screen: density pass for tablet walking (#173 slice) — fold secondary panels |
| 6.3 | Screen-reader / a11y pass (#452) — without changing deliberate colour+shape rules |
| 6.4 | Delete or quarantine unused `WallPlaceholderTiles` if still dead |
| 6.5 | Align stale DESIGN.md / CONTEXT.md lines that still ban or omit Student as second audience vs ADR-0025 |

---

## Out of scope for this plan

Do not pull these into “make the UI complete” unless a wave finishes early and the owner picks them:

- 350-feature map items (per-pupil pages, skill checklists, weekly digests, etc.)
- New Walls (emergency, celebrate, countdown, mission projector epics)
- Hardware `CommandableSource` / MAVLink commands
- Replacing simulator with radio as the default
- Recomputing scores on the Student tablet
- Bottom-tab phone shell from old Proposal Console (`design.md` history)

---

## Suggested PR sequence

```
Wave 0  chore: close shipped Student issues
Wave 1  fix(ui): honest door, Teacher words, semantic StepRail
Wave 2  fix(lesson): first step, admin dump, clearance queue, empty states
Wave 3  fix(layout): phone and tablet board (#625)
Wave 4  feat(classroom): /api/classroom + join by code (#628)
Wave 5  feat(ui): glare / projector + wall honesty
Wave 6  chore(ui): polish, a11y, doc drift
```

One PR per wave (or per table row if a wave balloons). Conventional commits. Close linked issues in the PR body.

---

## Definition of done (every wave)

1. `npm test` and `npm run typecheck` green.
2. No test deleted or weakened to pass.
3. Layout waves: shots reviewed (`scripts/shot.mjs`).
4. `docs/CHANGELOG.md` + `docs/DECISIONS.md` updated (or `docs/changelog.d/` fragment if in a multi-agent wave).
5. Deliberate positions and permanent ADR limits untouched.
6. Door copy always matches what a Student can actually do that day.

---

## Scoreboard (fill as waves land)

| Wave | Status | PR |
|---|---|---|
| 0 Hygiene | pending | — |
| 1 Honesty | pending | — |
| 2 Lesson | pending | — |
| 3 Narrow board | pending | — |
| 4 Cross-device Student | pending | — |
| 5 Daylight / walls | pending | — |
| 6 Polish | pending | — |
