# Master prompt

Paste the block below into Cursor. Paste **the same block again** to run the next batch —
it works out where it got to from the milestones and the closed issues, so it is safe to
re-run and safe to re-run after a failure.

It runs **one batch, then stops and reports.** That is deliberate. A run that keeps going
unattended across many batches is a run whose mistakes compound while nobody is looking.

---

```
You are orchestrating a multi-agent build on the TechTech Flight repository.
Platform: Windows. Shell: PowerShell. Repo: ReyAdhitya/techtechflight.

## Read first, in this order
CLAUDE.md · docs/PLAYBOOK.md · docs/DESIGN-TOKENS.md · docs/DELIBERATE-POSITIONS.md ·
CONTEXT.md · docs/agents/cursor/AGENT-BRIEF.md · docs/agents/cursor/WAVES.md ·
docs/agents/cursor/DEPLOY.md · docs/BACKLOG.md
CLAUDE.md overrides your defaults. Its Gotchas section is not optional reading.

## The gate — the one thing that is never negotiable
    npm test
    npm run typecheck
There is no lint; that pair is the entire gate. Both must pass before anything is
committed, and again before anything is merged.
If you cannot make the gate pass: STOP and report. Never delete a failing test, loosen an
assertion, add a skip, or cast to any. A red gate reported honestly is a useful result. A
green gate obtained by weakening a test is a lie the next agent inherits.

## Step 0 — prove main is green BEFORE spawning anything
    git checkout main && git pull
    npm test
    npm run typecheck
If main is red, STOP and fix that first. Do not start a wave on a red baseline: forty
agents will each independently report the same inherited failure, and you will not be able
to tell which failures are theirs. This is not hypothetical — main sat red for five commits
in July 2026 because a test selector went stale and nobody re-read CI.
Check CI history too, since a red main is easy to miss:
    gh run list --repo ReyAdhitya/techtechflight --branch main --limit 5 --json conclusion,displayTitle

## Step 1 — work out where you are
Run:  node scripts/validate-features.mjs
It must print "no collisions". If it does not, STOP — the wave plan is broken and running
agents against it will corrupt the branch.

Then find the first batch in docs/agents/cursor/WAVES.md whose tickets are still open:
    gh issue list --repo ReyAdhitya/techtechflight --milestone "Wave 1 — quick wins" --state open --limit 200
Run exactly one batch. Never two.

## Step 2 — cut the wave branch
    git checkout main && git pull
    git checkout -b feat/<wave>-<batch>      e.g. feat/wave1-batch-a
Push it. Every agent branches from this, not from main.

## Step 3 — fan out
Spawn ONE AGENT PER ROW of the batch table in WAVES.md — ten agents, four tickets each for
wave 1. Give every agent:
  - the full text of docs/agents/cursor/AGENT-BRIEF.md
  - its issue numbers and their bodies (gh issue view <n>)
  - the exact file list from each issue — it may create or edit NOTHING else
  - branch feat/<issue>-<slug>, cut from the wave branch

Agents in the same batch run at the same time. Agents in different batches never do.

WAVE 2 IS A PIPELINE, NOT A FAN-OUT. 167 → 168 → 169 → 170, strictly in order, one at a
time; only 171, 172, 173 and 176 may run together, and only after 170 exists. Parallelising
the spine gives you four incompatible track formats.

Each agent, for each ticket:
  1. Implement only what the issue says. Minimal diff. Match the surrounding code.
  2. Semantic colour tokens only (bg-canvas, text-ink-subtle, border-hairline). Sizes in
     rem. Colour is never the sole carrier of meaning. Strips never reorder.
  3. Tests beside the code. jsdom cannot catch a layout bug — when the invariant is a
     layout one, assert on the stylesheet (see SiteHeader.test.tsx).
  4. Run the gate.
  5. Write docs/changelog.d/<issue>.md — one Teacher-visible line. Do NOT touch
     docs/CHANGELOG.md or docs/DECISIONS.md.
  6. Commit — Conventional Commits, one per ticket, "Closes #<issue>" in the body, ending:
     Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  7. Push. Open a PR against the WAVE branch.
  8. Report: issue, branch, PR, real gate output, and WHERE IT THINKS THE COMPONENT SHOULD
     BE MOUNTED. Agents do not mount their own components — the Integrator does.

## Step 4 — the Integrator, one serial agent, after every agent has reported
This step is what turns tested code into a product. Skipping it ships invisible features.
It alone may touch the shared screens listed in WAVES.md. It must:
  - Merge every green PR into the wave branch, in issue order. Resolve conflicts by
    re-running the gate, never by deleting another agent's test.
  - Mount each new component on the right screen, using the agents' reports. Minimal diff.
  - Register any new wall route in web/app/(app)/walls/page.tsx.
  - Merge docs/changelog.d/*.md into docs/CHANGELOG.md in issue order; move any
    "DECISION:" paragraphs into docs/DECISIONS.md; delete the fragments.
  - Add anything non-obvious to the Gotchas in CLAUDE.md.
  - Run the gate on the wave branch.
  - Build and screenshot every screen it touched, from PowerShell:
        npm run build --workspace=web
        node scripts/shot.mjs <label> <route> 1280
    Close any shell sitting in web/out first or the build fails EBUSY.
    LOOK at the screenshots. Do not report a visual change as working without looking.

## Step 5 — merge, push, deploy
  - Open a PR from the wave branch to main. Merge it. Push main.
  - CI runs the gate on ubuntu AND windows. WAIT for it. If CI is red, fix it before
    deploying — never deploy a red build.
  - Deploy per docs/agents/cursor/DEPLOY.md. Route A is live: merging to main deploys
    automatically via the Vercel Git integration. Confirm by OPENING the deployment URL and
    checking the board renders and the demo Fleet is moving — not by reading a success
    message. If you land on route B, stop and hand back: vercel login is interactive.
  - Comment on each closed issue with its PR link.

## Step 6 — stop
Report, in plain words:
  - what landed, with issue and PR numbers
  - what failed, and why — no softening
  - the deployment URL, and that you opened it
  - which batch is next
Then STOP. Do not start another batch.
```

---

## Running it

**Do a single-agent dry run first.** Before ten agents inherit the brief, give one agent one
ticket from batch 1A and watch it: does it stay inside its file list, write its fragment,
pass the gate, open a clean PR? Fix the brief if not. Ten agents inheriting a bad brief is
ten times the mess, discovered ten times later.

Then run batch 1A properly, and re-paste for 1B.

## What this will and will not do

It builds a batch, gates it, merges it, pushes it and deploys it, unattended.

It will **not** build 350 features in one sitting, and nothing here pretends otherwise. Each
batch is forty tickets and one integration pass. That pacing is the reason the branch stays
mergeable — it is the feature, not the limitation.
