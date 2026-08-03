# Running the 350-feature build with Cursor

Four documents and one dataset. Read them in this order.

| File | What it is |
|---|---|
| [MASTER-PROMPT-ALL.md](./MASTER-PROMPT-ALL.md) | **Paste once, walk away.** Loops through every batch until the backlog is empty. |
| [MASTER-PROMPT.md](./MASTER-PROMPT.md) | One batch, then stops. Use when you want to look at each batch before the next. |
| [WAVES.md](./WAVES.md) | Who may run at the same time, and the Integrator step that makes a wave into a product |
| [AGENT-BRIEF.md](./AGENT-BRIEF.md) | The contract handed to every individual agent |
| [DEPLOY.md](./DEPLOY.md) | How this repo actually deploys — route A is live |
| `features.tsv` | The dataset: 350 rows of number, section, title, size, wave, **owned files**, acceptance |

`docs/BACKLOG.md` maps every feature number to the issue tracking it. It is generated —
edit `features.tsv` and re-run `scripts/create-feature-issues.mjs`, never the other way.

## The three ideas worth understanding before you start

**A wave is a conflict class, not a priority.** Every ticket owns a set of files; within a
wave, no file is owned twice. That is the only reason a wave's agents can run at the same
moment. `node scripts/validate-features.mjs` proves it, and is the first command the master
prompt runs.

**No ticket mounts its own component.** If forty tickets each edited `ControlScreen.tsx` the
wave would collapse, so the shared screens belong to a single serial **Integrator** that
runs at the end of every batch. Skip it and you ship forty tested, invisible features.

**The gate is the whole quality bar.** `npm test` and `npm run typecheck` — there is no
lint. An agent that cannot make them pass stops and says so. Nothing here is worth a
weakened test.

## Rebuilding or extending the tickets

```
node scripts/validate-features.mjs           # must print "no collisions"
node scripts/create-feature-issues.mjs --dry-run
node scripts/create-feature-issues.mjs       # resumable; skips what already exists
```

The creation script reads every existing issue title before writing anything, so re-running
it after a rate-limit pause or a crash is the correct response to almost any failure.

## Honest expectations

One batch is forty tickets and one integration pass. 350 features is not one sitting, and
the pacing is deliberate — it is what keeps the branch mergeable. Run a batch, look at what
came back, run the next.

Before the first real batch, give **one** agent **one** ticket and watch it. Ten agents
inheriting a bad brief is ten times the mess, found ten times later.
