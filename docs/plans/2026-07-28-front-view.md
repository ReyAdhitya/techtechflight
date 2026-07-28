# Work plan — Front view on the scope

Date: 2026-07-28 · Author: Planner · Status: **in PR (feat/scope-front-view)**

Product owner: *"add a front view."* One work item. Builds on the Side view (ADR-0016 / #19).

---

## Goal

Add a third scope picture — **Front** — so a Teacher can see height against the **other**
floor axis (the one Side does not use), in the same box, behind the same kind of toggle.

One sentence: **Top-down = denah; Side = tinggi vs timur–barat; Front = tinggi vs utara–selatan.**

---

## What exists today (verified)

`web/components/Scope.tsx`:

- `ScopeView = 'top-down' | 'side'` (`Scope.tsx:523`)
- Toggle buttons map `['top-down', 'side']` (`Scope.tsx:132-147`)
- **Side** places marks with:
  - horizontal = `percentOf` → **east** (`xPercent`) (`Scope.tsx:99-103`)
  - vertical = `altitudeM` / ceiling (`Scope.tsx:102-103`)
- Aspect / viewBox for Side: `widthM × ceilingM` (`Scope.tsx:162-168`)
- Ground line only in Side (`Scope.tsx:221-230`)
- Conflict / link lines **top-down only** (`Scope.tsx:233-239`, ADR-0016)
- Heightless craft named in caption, not grounded (`Scope.tsx:96`, ADR-0016)

`docs/adr/0016-a-side-view-on-the-scope.md` **Out of scope** currently includes:

> **Any third view.**

That line is superseded by this plan. Write **ADR-0017** in the same PR before or with the
toggle change, or the next reader deletes Front as a violation of 0016.

---

## Decided axes (do not improvise)

| View | Looking from | Horizontal axis | Vertical axis |
|---|---|---|---|
| Top-down | Above | East | North |
| Side | South (looking north) | **East** | Altitude |
| Front | West (looking east) | **North** | Altitude |

Square window ⇒ east span = north span = `sideM`, so Front and Side share the same
aspect-ratio shape (`sideM / ceilingM`). They differ only in **which floor coordinate**
drives `x`.

Labels on the toggle (English, words not icons — same rule as ADR-0016 / DESIGN §1.2):

`Top-down` · `Side` · `Front`

---

## Approach

1. **ADR-0017** — why Front exists (the missing elevation), why it reuses Side's ceiling /
   ground / heightless / no-conflict rules, and that it supersedes ADR-0016's "any third
   view". Equal metre scale still holds.

2. **Extend `ScopeView`** to `'top-down' | 'side' | 'front'`.

3. **Placement (`at()`)** — branch:
   - `top-down` → unchanged `percentOf`
   - `side` → east → x, altitude → y (unchanged)
   - `front` → **north → x**, altitude → y  
     Derive north percent from `scope.project` / window bounds the same way east percent is
     derived today — do not invent a second window.

4. **SVG grid for Front** — vertical rules on **north** lines; horizontal rules on ceiling
   ladder (same as Side). Ground line at altitude 0 (same as Side).

5. **Aspect / viewBox** — Front uses the same formula as Side (`sideM` × `ceilingM`). Shared
   ceiling ref (`heldCeilingM`) already grows-never-shrinks; reuse it.

6. **Conflicts / links** — still top-down only (ADR-0016 reasoning unchanged).

7. **Default** — still `top-down` on every load; choice not persisted.

8. **DESIGN.md / CHANGELOG / PLAYBOOK** — mention the third view where the scope is
   described; do not leave docs saying there are only two.

9. **Tests** (`Scope.test.tsx`) — pin:
   - toggle shows three controls; Front is reachable
   - two Drones with same east, different north, same height: on Front their **x** differs;
     on Side their **x** matches (that is the whole point of the third view)
   - heightless still omitted + named on Front
   - viewBox / aspectRatio inline style on Front matches Side's ceiling rule

10. **Screenshot** — build, then from PowerShell:  
    `node scripts/shot.mjs scope-front /control 1440`  
    (toggle to Front in the shot path if the script cannot click — otherwise photograph
    after documenting how the engineer forced the view for the shot). jsdom cannot see
    aspect ratio correctness by eye.

---

## What could break

- Toggle row wrapping on 390 px with three pills — hit-test / screenshot phone width.
- Any code that switches on `view === 'side'` for "elevation mode" must treat Front the same
  where height applies (ground line, heightless, aspect). Factor a helper
  `isElevation(view)` if the branches duplicate — only if it stays readable.
- ADR-0016 readers who treat "any third view" as law — ADR-0017 must exist in the PR.
- Issue **#27** (stable strip order) is **independent**; do not combine branches.

---

## Must not change

- Status five words; `'watch'` key; English product copy.
- Fixed scope window / boardOrder rules / MAVLink.
- Conflict lines on elevation views.
- Ceiling ladder `[2, 4, 8]` and grow-never-shrink (reuse Side's).

---

## Acceptance

- [ ] Toggle offers Top-down / Side / Front; default Top-down.
- [ ] Front: horizontal = north, vertical = altitude; metre scale equal (same Side invariant).
- [ ] Heightless craft named, not drawn on ground, on Front.
- [ ] No conflict/link lines on Front.
- [ ] ADR-0017 present; ADR-0016's "any third view" superseded in writing.
- [ ] `npm test` + `npm run typecheck` green; new Scope tests above pass.
- [ ] Screenshot at 1440 (and 390 if toggle wraps).

---

## Out of scope

- Showing two views at once (ADR-0016 already deferred that).
- FPV / camera "front of the aircraft".
- Persisting the selected view.
- Strip-order work (#27).
