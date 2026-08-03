# Master prompt — run everything, one paste

The one-batch version is [MASTER-PROMPT.md](./MASTER-PROMPT.md). **This** one loops until
the backlog is empty. Paste it once and leave it.

Batching still happens — it has to, or the merges collapse — but the orchestrator does the
batching instead of you doing it by hand eleven times.

## What to expect

- It will run for **many hours**. 350 tickets, roughly eleven batches, a gate and an
  integration pass on each.
- It **stops on the first batch it cannot land**, and does not try the ones after it. That
  is deliberate. A loop that shrugs off a failure and keeps going produces 300 branches
  nobody can untangle.
- Everything before the stopping point is merged, deployed, and yours. You lose the
  remainder, not the run.
- Check on it between batches if you can. The earlier a systematic mistake is caught, the
  fewer tickets inherit it.

---

```
You are orchestrating the complete 350-feature build on the TechTech Flight repository.
Platform: Windows. Shell: PowerShell. Repo: ReyAdhitya/techtechflight.

Run EVERY batch, one after another, until no feature issues remain open. Do not stop
after one batch. Do not ask for confirmation between batches. Work until the backlog is
empty or a batch cannot be landed.

## Read first, in this order
CLAUDE.md · docs/PLAYBOOK.md · docs/DESIGN-TOKENS.md · docs/DELIBERATE-POSITIONS.md ·
CONTEXT.md · docs/agents/cursor/AGENT-BRIEF.md · docs/agents/cursor/WAVES.md ·
docs/agents/cursor/DEPLOY.md · docs/BACKLOG.md
CLAUDE.md overrides your defaults. Its Gotchas section is not optional reading.

## The gate — never negotiable, every ticket, every batch
    npm test
    npm run typecheck
There is no lint; that pair is the entire gate. If you cannot make it pass: STOP the whole
run and report. Never delete a failing test, loosen an assertion, add a skip, or cast to
any. A green gate obtained by weakening a test is a lie every later batch inherits.

## Before the loop, once
    git checkout main && git pull
    npm test && npm run typecheck
    node scripts/validate-features.mjs
main must be green and the validator must print "no collisions". If either fails, STOP —
do not start a run on a broken baseline.

## THE LOOP — repeat until there are no open issues with the "feature" label

Each pass through the loop is ONE batch:

1. PICK THE BATCH.
   gh issue list --repo ReyAdhitya/techtechflight --label feature --state open --limit 400
   Take the next batch in docs/agents/cursor/WAVES.md order: wave 1 batches A, B, C, then
   wave 2, then wave 3, then wave 4 in batches of forty.
   A batch is at most 40 tickets and at most 10 agents. Never more.

2. CUT THE WAVE BRANCH.
   git checkout main && git pull
   git checkout -b feat/<wave>-<batch>
   Push it. Every agent branches from this, never from main.

3. FAN OUT — one agent per row of the batch table, four tickets each.
   Give every agent: the full text of AGENT-BRIEF.md, its issue bodies
   (gh issue view <n>), and the exact file list from each issue.
   It may create or edit NOTHING outside that list, plus docs/changelog.d/<issue>.md.

   WAVE 2 IS A PIPELINE, NOT A FAN-OUT. 167 → 168 → 169 → 170 strictly in order, one at a
   time. Only 171, 172, 173, 176 may run together, and only after 170 exists. Parallelising
   the spine gives four incompatible track formats.

   Each agent: implement only what the issue says · semantic colour tokens
   (bg-canvas, text-ink-subtle, border-hairline), sizes in rem, colour never the sole
   carrier of meaning, strips never reorder · tests beside the code, and when the invariant
   is a layout one assert on the stylesheet because jsdom cannot catch a layout bug ·
   run the gate · write docs/changelog.d/<issue>.md and touch NEITHER docs/CHANGELOG.md
   NOR docs/DECISIONS.md · Conventional Commit with "Closes #<issue>" and
   Co-Authored-By: Claude Opus 5 <noreply@anthropic.com> · push · PR against the wave
   branch · report the real gate output and WHERE THE COMPONENT SHOULD BE MOUNTED.

4. INTEGRATE — one serial agent, after every agent has reported. Never skip this.
   Without it the batch ships tested, invisible code. It alone touches the shared screens
   listed in WAVES.md. It must:
     - merge every green PR into the wave branch in issue order, resolving conflicts by
       re-running the gate, never by deleting another agent's test
     - mount each new component on the right screen, using the agents' reports
     - register any new wall route in web/app/(app)/walls/page.tsx
     - merge docs/changelog.d/*.md into docs/CHANGELOG.md in issue order, move any
       "DECISION:" paragraphs into docs/DECISIONS.md, delete the fragments
     - add anything non-obvious to the Gotchas in CLAUDE.md
     - run the gate on the wave branch
     - build and screenshot every screen it touched, from PowerShell:
           npm run build --workspace=web
           node scripts/shot.mjs <label> <route> 1280
       Close any shell sitting in web/out first or the build fails EBUSY.
       LOOK at the screenshots. Never report a visual change as working without looking.

5. LAND AND DEPLOY.
   PR from the wave branch to main. Merge. CI runs the gate on ubuntu AND windows — WAIT
   for it. If CI is red, fix it before deploying; never deploy a red build.
   Route A is live: merging to main deploys via the Vercel Git integration. Confirm by
   OPENING the deployment URL and checking the board renders and the demo Fleet is moving,
   not by reading a success message.
   Comment on each closed issue with its PR link.

6. REPORT THE BATCH in two or three lines — what landed, what did not — then GO BACK TO
   STEP 1 for the next batch.

## When to stop the whole run
Stop, and do not start another batch, if any of these happen:
  - the gate cannot be made to pass honestly
  - CI is red on main after a merge
  - the same batch fails twice
  - an agent reports it needs a file another ticket owns (the wave plan is wrong — fix
    features.tsv, re-run validate-features.mjs, do not improvise)
  - a deployment fails
Everything already merged stays merged. Report where you stopped and why.

## Final report
Batches landed · features shipped, by number · what stopped you, if anything · the
deployment URL and confirmation you opened it · which issues remain open.
```
