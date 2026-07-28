# Work plan — Training scenarios (FULL surface coverage)

Date: 2026-07-28 · Author: Planner · Status: **in PR (feat/training-scenarios)** · **Amended: cover every Teacher surface**

Product owner: AED-style simulation scenarios — **every function must react** to incoming
data. Not a telemetry-only subset.

Issue: #30

---

## Goal (one sentence)

A catalog of **named training scenarios** on the simulated Fleet that, taken together,
**exercise every primary Teacher surface and every live reaction path** — so a demo or QA
pass can claim the webapp integrates incoming data end-to-end, without a real drone.

---

## Coverage map (acceptance spine)

Every row must be hit by **at least one** scenario. Engineer ticks this table in the PR.

| Surface / function | Must be exercised by |
|---|---|
| **Fleet** board (Status, Needs Attention, fixed tile order) | T4, T3 |
| **Control** — Attention bar | T1, T2, T5 |
| **Control** — Scope top-down + conflict/link lines | T1, T6 |
| **Control** — Scope Side (height) | T7 |
| **Control** — Scope Front (when #28 merged; else skip + note) | T7b |
| **Control** — flight strips (coords, charge, alerts, anatomy) | T1, T2, T7 |
| **Control** — Commands Land / Hold / Stop (sim only) | T8 |
| **Control** — LessonStrip while lesson running | T9 |
| **Lesson** — plan exercises, start lesson | T9 |
| **Students** — assign Student ↔ Drone | T9 |
| **Reports** — lesson summary / recurring defects path | T10 |
| **Drone detail** (`/drone?id=`) — service decision, note, instruments | T11 |
| **Settings** — ground station block + scenario runners live here | T0 (meta) |
| **Stale / ageing readings** | T3 |
| **Lost ground-station / reconnect honesty** (demo-only or scripted hold) | T12 |
| **Emergency stop latch + release path** | T5 |
| **Auto-land / camera** if exposed on simulator API | T13 (if API exists; else document gap) |
| **MAVLink path** | **Out of this issue** — separate smoke (already E2E once); do not block #30 |

Primary nav today: Control · Fleet · Lesson · Students · Reports (+ Settings, Drone).

---

## Catalog (named scenarios)

### T0 — Runner shell (meta)
Settings hosts **Run / Reset** for all T-scenarios. Hidden when `scenarios == null`. C9:
never beside strip Commands.

### T1 — Separation conflict
Two airborne Drones closer than 1.5 m.  
**Hits:** Attention NOW, strip alerts, Scope **solid** conflict (top-down), nearest-aircraft.

### T2 — Low charge while flying
takeOff + flatten battery.  
**Hits:** charge/endurance on strip, Land-now (or equivalent) alert, Fleet attention.

### T3 — Lost link then restore
loseLink → observe Offline/stale → restoreLink.  
**Hits:** Fleet Offline, Control honesty on age, restore clears.

### T4 — Fault / withdraw
injectFault.  
**Hits:** Status Fault, instruction alert, Fleet Needs Attention tile still in boardOrder.

### T5 — Emergency stop
takeOff + emergency-stop (+ reset/release if API exists).  
**Hits:** emergency alert copy, Command/Stop affordance behaviour on sim.

### T6 — Link group
`link` whole Fleet (stdin `n` already).  
**Hits:** Scope **dashed** group ties (top-down).

### T7 — Height / Side view
Two airborne at different `altitudeM` (place + climb as needed).  
**Hits:** strip Z / height cell; engineer **toggles Side** and confirms marks separate vertically; screenshot.

### T7b — Front view
Same as T7 after #28 lands; toggle Front; north axis separation. If #28 not merged: checklist says SKIP until Front ships — **do not block #30 merge**, but leave the row in the coverage map.

### T8 — Commands react to state
Airborne Drone: Land / Hold succeed on sim; grounded: those disabled; Stop (emergency) path.  
**Hits:** Command row enabled/disabled + `describeCommand` stages (sent/waiting/done) where observable.

### T9 — Lesson + Students integration
Assign Students on **Students**; add/start Exercise on **Lesson**; start lesson; on **Control** LessonStrip shows; strip shows Exercise name; end lesson.  
**Hits:** Students, Lesson, LessonStrip, Exercise-on-strip. Use simulator Fleet still live underneath.

### T10 — Reports after a lesson
After T9 (or a short scripted lesson with a Fault), open **Reports**.  
**Hits:** report content reflects counted events / recurring path as product currently shows (assert what exists, do not invent new report features).

### T11 — Drone detail
Open `/drone?id=ttf-0001` during Fault or after service toggle.  
**Hits:** instruments, service decision, note save (logbook), emergency notice if latched.

### T12 — Stale / held state (honesty)
Drive readings old enough to be Stale (or use showcase stale only if live path cannot — prefer live).  
**Hits:** age wording, not presented as current (DESIGN §11.1).

### T13 — Extra simulator affordances (optional if already API-backed)
Auto-land, camera on — only if `ScenarioControls` / simulator already support; wire into panel. No new aircraft behaviour invented for vanity.

---

## Approach

1. **`docs/training-scenarios.md`** — full catalog + per-scenario human checklist + coverage map tick list.
2. **Settings UI** — named scenarios with Run / Reset; keep atomic buttons or fold under “Advanced”; C9.
3. **Simulator gaps** — add `placeNear`, altitude setters, emergency on `ScenarioControls` as needed for T1/T5/T7.
4. **Tests** — automate every scenario that is pure data→vitals→DOM text; for Lesson/Reports/Side use the strongest assert possible + **screenshots** where jsdom cannot see layout.
5. **One “full drill” script** (optional): Run T9→T1→T2→T5→T10 in docs as the boss demo path (“AED full exam”).

Phases can land as commits: docs → controls/API → runners → Lesson/Reports scenarios → tests/shots.

---

## Must not

- Status five words; `'watch'` key; CommandableSource on MAVLink.
- Scenario triggers on the flight strip.
- Blocking forever on #28 Front — T7b is conditional.
- Claiming MAVLink covered inside #30.

---

## Acceptance (owner bar: KENA SEMUA)

- [ ] Coverage map above: every **required** row ticked in PR (T7b conditional).
- [ ] Named Run in Settings for T1–T6, T8–T11 at minimum; T7 documented with toggle step; T12–T13 as applicable.
- [ ] Screenshots: Control (T1 conflict), Side (T7), Fleet (T4), Lesson+Control lesson running (T9), Reports (T10), Drone detail (T11) @1440.
- [ ] `docs/training-scenarios.md` + boss one-pager “full drill” order.
- [ ] `npm test` + `typecheck` green; automated pins for T1–T5 at least.

Branch from `main`. Do not combine with #27/#28 unless explicitly stacked later.
