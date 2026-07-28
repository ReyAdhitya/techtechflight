# Work plan — Tighten the Every Drone flight strip

Date: 2026-07-28 · Author: Planner · Status: **ready to execute**

Owner: the Control **Every Drone** strip looks sparse and messy — large empty middle,
loose alignment, Land/Hold vs Stop feel disconnected.

---

## Goal (one sentence)

Make each flight strip **scannable and tight** while keeping the fixed five-cell head anatomy
and the deliberate Stop separation — fix layout, not invent a new strip.

---

## What is wrong (verified)

List columns today (`ControlScreen.tsx:132`):

```ts
'min-[60rem]:grid-cols-[auto_auto_auto_1fr_auto]'
```

Order: Name · Student · height · **charge (1fr)** · response.

**`1fr` is on the charge cell.** Charge text left-aligns inside a stretched column → a
cavern between height and “Response just now”. That matches the screenshot.

Commands (`CommandRow`): Land / Hold left, Stop `ml-auto` right — **intentional** (Stop away
from Land; DESIGN §4.4 / safety). The empty middle there is acceptable **if** the head row
is tight; today both rows look abandoned.

Quiet strip (no Exercise, no alert, coords `0.0`): second line is a thin XYZ row over a
tall empty card — vertical padding/`gap-2` reads as wasted space.

---

## What must stay (do not “fix” these)

| Keep | Why |
|---|---|
| Five head cells, fixed order | DESIGN §4.4 — eye learns charge position |
| Coordinates on **own line**, not in head | DESIGN §4.4 — already decided |
| boardOrder strip list | #27 / deliberate position #1 |
| Stop separated from Land/Hold | Safety; confirm-on-Stop; Release when latched |
| Semantic tokens (`bg-surface-1`, `text-ink-subtle`, …) | CLAUDE.md |
| No phase word in head | #20 |
| English | ADR-0015 |

**Out of scope:** redesigning Attention bar, Scope, new card chrome, purple/glow, merging
Stop into Land/Hold cluster.

---

## Approach

### 1. Fix the column template (main visual bug)

Change list + subgrid so **`1fr` is the last column** (response), not charge:

```ts
min-[60rem]:grid-cols-[auto_auto_auto_auto_1fr]
```

- Cells 1–4: Name, Student, height, charge — `auto`, snug.
- Cell 5: response age — `1fr`, **`text-right`** (drop redundant `ml-auto` if the column
  already pushes it right).

Amend the comment at `ControlScreen.tsx:113-127` / DESIGN wireframe if the ASCII still
implies charge eats the freespace.

### 2. Quiet-strip density

- Keep `gap-2` only when there is content below the head (coords / exercise / separation /
  alerts / commands). Prefer **one** vertical stack with consistent `gap-1.5` or `gap-2`,
  not a tall empty `flex-col` when only coords + commands exist.
- Do not remove the commands row when airborne/grounded rules still need Land/Hold/Stop.

### 3. Command row polish (without merging Stop)

- Single row: `flex items-center gap-2`, Land + Hold, then `ml-auto` Stop/Release.
- Ensure the row does not wrap Stop alone onto a distant line on desktop (`min-[60rem]`).
- Phone: wrapping OK; hit targets `min-h-11` stay (§11.3).

### 4. Docs

- `docs/DESIGN.md` §4.4 wireframe: show Response right-aligned after a visual gap, charge
  not stretched.
- One CHANGELOG line under Fixed.

### 5. Tests / shots

- Existing strip tests must still find Name, charge, Response, Land, Hold, Stop.
- **Screenshot** `/control` @1440 and @390 — quiet strip + one strip with alert. Build
  first; PowerShell for `scripts/shot.mjs`. jsdom cannot see the cavern.

---

## What could break

- Subgrid `contents` / column count mismatch → cells jump columns (assert five head
  children still map 1:1).
- Tablet wrap bug DESIGN §4.4 warns about — hit-test Command buttons after density change.
- Tests that query layout strings only — unlikely; update if any assert old class token.

---

## Acceptance

- [ ] At 1440px, head row: Name·Student·height·charge sit in a tight left group; Response
      flush right; **no wide empty band inside the charge column**
- [ ] Coordinates remain on the line below the head
- [ ] Land/Hold left, Stop/Release right; Stop still confirm-gated
- [ ] boardOrder unchanged; Status / `watch` untouched
- [ ] Screenshots before/after @1440 (and 390)
- [ ] `npm test` + `npm run typecheck` green

Branch from `main`. Prefer one or two commits: `fix: put strip freespace in the response column` then optional `fix: tighten quiet flight-strip vertical rhythm`.
