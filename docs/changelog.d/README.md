# Changelog fragments

One file per issue, named `<issue-number>.md`, holding the one line a Teacher would notice:

```markdown
- **Land all now.** One control lands every airborne craft, held down to confirm.
```

If you made a judgement call someone could reasonably have made differently, add a second
paragraph headed `DECISION:` in the same file. It moves to `docs/DECISIONS.md`.

## Why this exists

`docs/CHANGELOG.md` and `docs/DECISIONS.md` are appended to by every task, which is fine
when tasks are serial and a guaranteed three-way conflict when ten agents finish at once.

So during a parallel wave nobody edits those two files. Each agent drops a fragment here,
and the **Integrator** — one serial agent at the end of the wave — merges them in issue
order, moves any `DECISION:` paragraphs across, and deletes the fragments.

This adapts the standing "update the changelog after every task" rule in `CLAUDE.md` for
parallel runs only. Working on your own? Edit `docs/CHANGELOG.md` directly, as always.

A leftover fragment here means a wave was never integrated. That is a bug, not a backlog.
