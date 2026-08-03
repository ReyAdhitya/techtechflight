# Agent brief — the contract every agent works to

One agent, one ticket (or one small themed set). This is the whole contract; the ticket
body supplies the specifics.

## The rule that matters most

**You may create or edit only the files listed in your ticket, plus your own changelog
fragment.** Nothing else. Not a shared screen, not the changelog, not another agent's file,
not "just one import". Other agents are working at the same moment and their edits are
invisible to you until merge. This one rule is what makes a parallel wave safe.

If your ticket seems to require a file you do not own — **stop and report it**. Do not take
the file. The wave plan is wrong, and it is cheaper to fix the plan than to unpick a
three-way conflict.

## Your component will not be mounted, and that is correct

Most tickets build a new component and a new lib module. **They do not wire it into a
screen.** `ControlScreen.tsx`, `SettingsScreen.tsx`, `ReportsScreen.tsx` and the rest are
owned by the **Integrator**, a single serial agent that runs at the end of the wave and
mounts everything the wave produced.

So your definition of done is: the component exists, is exported, is tested in isolation,
and passes the gate. A reviewer being unable to see it in the running board yet is expected.
Say in your report **where you think it should be mounted** — the Integrator reads those.

## Before you write anything

Read, in this order:

1. `CLAUDE.md` — overrides your default habits. Read the Gotchas section twice.
2. `docs/PLAYBOOK.md` — stack, versions, pitfalls.
3. `docs/DESIGN-TOKENS.md` — the design system as actually built.
4. `docs/DELIBERATE-POSITIONS.md` — six things that look like bugs and are not. If your
   ticket seems to contradict one, it does not; re-read the ticket.
5. `CONTEXT.md` — the words. Use the product's vocabulary, not your own.

## House style, non-negotiable

- **Semantic colour layer only** — `bg-canvas`, `text-ink-subtle`, `border-hairline`.
  `bg-background` works and is foreign. Never a raw hex.
- **Every size in `rem`.** A `px` font-size on this surface is a defect (ADR-0008).
- **Colour is never the sole carrier of meaning** (ADR-0004). Every status carries a word
  or a shape as well.
- **Tiles and Control strips never reorder** when status or alerts change
  (DELIBERATE-POSITIONS 1).
- **Counts render at zero.** An empty Attention queue shows `0`, not nothing
  (DELIBERATE-POSITIONS 3).
- **Commands reach the simulated Fleet only** (ADR-0011). Nothing you build sends anything
  to hardware.
- **Never put stream URLs, Logbook rows or pupil names into Telemetry.**
- Say what the Teacher should *do*, not only what the number is. Numbers are additional,
  never primary.

## The gate

```
npm test
npm run typecheck
```

Both must pass before you commit. There is no lint; that pair is the entire gate.

**If you cannot make the gate pass, stop and report.** Do not delete a failing test, loosen
an assertion, add a skip, or cast to `any` to get through. A red gate reported honestly is a
useful result; a green gate obtained by weakening a test is a lie the next agent inherits.

Old tests must still pass. If your change breaks one, that is a signal about your change,
not about the test.

## Tests

Write them beside the code, in the pattern already there.

**jsdom cannot catch a layout bug.** The whole suite is jsdom, so a broken flex axis or a
wrong aspect ratio passes green. When the invariant is a layout one, assert on the
stylesheet directly — see `SiteHeader.test.tsx`, and `vercel-routing.test.ts` for the same
idea applied to config.

For anything visual, build and look at a screenshot before believing it works:

```powershell
npm run build --workspace=web
node scripts/shot.mjs <label> <route> 1280
```

Run that from **PowerShell** — Git Bash rewrites a bare `/route` into a Windows path. Close
any shell sitting in `web/out` first or the build fails `EBUSY`.

Print is the same class of bug: dark-theme semantic tokens stay light-on-white unless
`@media print` resets them.

## Your changelog fragment

Write `docs/changelog.d/<issue-number>.md` — one line a Teacher would notice:

```markdown
- **Land all now.** One control lands every airborne craft, held down to confirm.
```

**Do not touch `docs/CHANGELOG.md` or `docs/DECISIONS.md`.** Twelve agents appending to the
same two files is a guaranteed conflict. The Integrator merges the fragments in issue order
at the end of the wave.

If you made a judgement call someone could reasonably have made differently, add a second
paragraph headed `DECISION:` in the same fragment. The Integrator moves it to
`docs/DECISIONS.md`.

## Commit and push

Conventional Commits (`CLAUDE.md`). One commit per ticket:

```
feat: lock the screen so a pupil cannot press Stop

The Teacher can lock Control while pupils are at the laptop. Every Command
control disables and says why, so a locked board never looks broken.

Closes #123

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

Branch `feat/<issue>-<short-slug>`, cut from the **wave branch**, not from `main`. Push it
and open a PR against the wave branch.

## Report back

- Which issue, which branch, which PR.
- Gate result — actual output, not a claim.
- **Where you think this should be mounted**, for the Integrator.
- Anything you could not do, and why. Say it plainly; a half-done ticket reported honestly
  is worth more than a complete-sounding one that is not.
