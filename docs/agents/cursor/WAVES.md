# Waves — who runs at the same time, and who must not

A **wave is a conflict class, not a priority.** Every ticket in a wave owns a set of files,
and within a wave no two tickets own the same file. That is what lets their agents run
simultaneously. Ordering across waves is about dependency and shared files, nothing else.

Verified by machine, not by eye:

```
node scripts/validate-features.mjs
```

It fails if any file is owned twice inside one wave. **Run it after editing
`features.tsv`, before running any wave.**

Current state: 350 features, 779 owned files, no collisions.
Wave 1 — 121 · Wave 2 — 8 · Wave 3 — 3 · Wave 4 — 218.

---

## The Integrator — the piece that makes the rest work

Tickets deliberately do **not** own the shared screens. If they did, forty agents would all
edit `ControlScreen.tsx` and the wave would collapse. So no feature ticket mounts its own
component, and every wave ends with **one serial Integrator agent** that does.

Without this step a wave produces working, tested, completely invisible code. It is not
optional cleanup; it is where the wave becomes a product.

**The Integrator alone owns these files:**

```
web/components/ControlScreen.tsx      web/components/ReportsScreen.tsx
web/components/FleetScreen.tsx        web/components/SettingsScreen.tsx
web/components/FleetBoard.tsx         web/components/StudentsScreen.tsx
web/components/LessonScreen.tsx       web/components/SiteNav.tsx
web/components/LessonStrip.tsx        web/components/Scope.tsx
web/components/FleetProvider.tsx      web/app/(app)/layout.tsx
web/app/globals.css                   web/app/(app)/walls/page.tsx
docs/CHANGELOG.md                     docs/DECISIONS.md
```

Its job, in order:

1. Read every agent's report — each says where it thinks its component belongs.
2. Mount each new component on the right screen. Minimal diff: an import and a line.
3. Add new wall routes to the walls hub (`web/app/(app)/walls/page.tsx`).
4. Merge `docs/changelog.d/*.md` into `docs/CHANGELOG.md` in issue order, move any
   `DECISION:` paragraphs into `docs/DECISIONS.md`, delete the fragments.
5. Add anything non-obvious to the Gotchas in `CLAUDE.md`.
6. Run the gate. Build. Take screenshots of every screen it touched.
7. Open the wave PR to `main`.

**Wave 2 exception:** ticket `168` owns `web/app/(app)/layout.tsx` because mounting the
recorder app-wide *is* the ticket. In wave 2 the Integrator must not touch that file.

---

## Wave 1 — quick wins · 121 tickets

New file, new test, no shared screens. Conflict-free by construction, which is why so many
can run together. Too many to run at once for human reasons — PR volume and review — so run
it in **batches of ten agents, four tickets each**.

**The numbers in these tables are feature numbers, not issue numbers.** Look the issue up in
`docs/BACKLOG.md` — it maps every one of the 350 to the issue tracking it. Hand agents the
issue, not the feature number.

### Batch 1A — the forty highest-payoff, ten agents

| Agent | Theme | Tickets |
|---|---|---|
| A1 | Prep and the fleet before class | 1, 10, 11, 12 |
| A2 | Assignment | 25, 28, 29, 30 |
| A3 | Waiting list and briefing | 31, 32, 37, 38 |
| A4 | Live awareness | 45, 47, 48, 50 |
| A5 | Safety controls | 57, 82, 83, 85 |
| A6 | Safety limits | 78, 79, 80, 92 |
| A7 | Camera | 102, 103, 109, 112 |
| A8 | Packing down | 152, 153, 154, 157 |
| A9 | Reports | 189, 191, 193, 195 |
| A10 | Pupils | 221, 223, 226, 231 |

Then the Integrator.

### Batches 1B onward

Same shape, four tickets per agent, ten agents per batch, taking the remaining wave-1
tickets in ascending number order:

```
  7  13  14  19  22  34  35  39  41  42  51  59  65  72  76  86  87  94 100 113
115 116 122 134 136 145 146 147 148 150 151 155 158 159 160 161 163 196 198 199
201 204 209 227 230 232 237 240 241 245 250 251 252 253 260 262 264 271 274 276
277 278 280 281 282 284 287 291 293 294 302 306 309 324 326 327 328 332 337 338
339
```

That is 81 tickets — 121 in wave 1, less the 40 in batch 1A. Regenerate it rather than
trusting this block if `features.tsv` changes:

```
node -e "const r=require('fs').readFileSync('docs/agents/cursor/features.tsv','utf8').trim().split('\n').slice(1);console.log(r.map(x=>x.split('\t')).filter(c=>c[4]==='1').map(c=>c[0]).join(' '))"
```

Each batch ends with an Integrator pass. **Do not skip it and batch two waves of
integration together** — that is exactly the twelve-agents-one-file problem, moved.

## Wave 2 — replay spine · 8 tickets

**A pipeline, not a fan-out.** Each stage needs the one before it to exist. Running these in
parallel produces four agents inventing four incompatible track formats, which is worse than
running them slowly.

```
167  flight-track store          ← alone, first. Everything below reads its types.
 ↓
168  headless recorder           ← owns web/app/(app)/layout.tsx this wave
 ↓
169  frame reconstruction        ← pure; needs 167's types
 ↓
170  replay dialog + transport   ← the payoff; needs 169
 ↓
171 · 172 · 173 · 176            ← these four may run in parallel, they need 170
```

Then the Integrator mounts the Replay entry on `LessonReports`, writes
`docs/adr/0018-replay-tracks-are-not-logbook-rows.md`, and merges the fragments.

**The position to hold in that ADR:** flight tracks are Telemetry, not the Teacher's
written record. They are large, bounded and disposable; the Logbook is small, permanent, and
dual-writes to Vercel Blob (ADR-0015). Tracks therefore live in their own `localStorage` key
`techtechflight:replay` and are **never** synced.

## Wave 3 — shared and heavier · 3 tickets

| Ticket | Why it waits |
|---|---|
| 77 geofence breach alert | Raises Attention items — needs wave 1's live-surface work settled |
| 101 Record writes a real clip | Rewrites `camera-recording.ts`, which wave-1 camera tickets read |
| 317 export and import the Logbook | Touches the Logbook write path; nothing else may be mid-flight |

Run all three in parallel — their files do not overlap — then Integrate.

**101 cannot be proven by jsdom.** `MediaRecorder` does not exist there. Stub it for the
mark and the fallback copy, verify a real clip by hand in Chrome, and **say so in the PR**
rather than implying coverage that does not exist.

## Wave 4 — the long tail · 218 tickets

Everything else. Re-run `validate-features.mjs` and re-batch when you get here; many of
these are `M` and `L` and several will want splitting into smaller tickets first.

---

## If two agents collide anyway

It means the plan was wrong, not that the agents were. Fix it in this order:

1. **Stop the wave.** Do not merge either branch yet.
2. Find which file both claimed, and which ticket should own it.
3. Correct `features.tsv`, re-run `validate-features.mjs`, update the affected issues.
4. Re-run the losing ticket from a fresh branch.

Resolve a merge conflict by re-running the gate, never by deleting the other agent's test.
