# Deploy

**Route A is live on this repo. Nothing needs installing and nobody needs to log in.**

Checked 2026-08-03: `vercel[bot]` creates Production deployments on
`ReyAdhitya/techtechflight`, so the Vercel Git integration is connected. Merging to `main`
deploys on its own.

```
gh api repos/ReyAdhitya/techtechflight/deployments --jq '.[0:3] | .[] | "\(.environment) \(.creator.login) \(.created_at)"'
```

Run that first, every time. If the newest entry is not from `vercel[bot]`, the integration
was disconnected and you are on route B.

## Route A — Git integration (current)

1. Merge the wave PR into `main`.
2. CI (`.github/workflows/ci.yml`) runs the gate on **ubuntu and windows**. Wait for it.
   **If CI is red, stop — do not deploy a red build.**
3. Vercel builds automatically from `vercel.json`:
   `NEXT_PUBLIC_DEMO_ONLY=1 npm run build --workspace=web`, output `web/out`.
4. Confirm the deployment, and confirm it by **opening it**, not by reading a success
   message:

```
gh api repos/ReyAdhitya/techtechflight/deployments --jq '.[0].id'
gh api repos/ReyAdhitya/techtechflight/deployments/<id>/statuses --jq '.[0] | "\(.state) \(.environment_url)"'
```

Load the URL. The board should render and the demonstration Fleet should be moving. A page
that renders but sits frozen is a failed deploy that reported success.

## Route B — CLI, only if A is disconnected

The CLI is **not installed** here, and `vercel login` is interactive — an agent cannot
complete it. If you reach this route, stop and hand it back to the person running the
session with this instruction:

```
npm i -g vercel
! vercel login
vercel --prod
```

(The `!` prefix runs the command in the Claude Code session so its output lands in the
conversation.) The `.vercel/project.json` link already exists — project `techtechflight`,
`prj_F9BUVYadkdtc36lTvceFRjGa3QLW` — so no re-linking is needed.

## What the deployed copy actually is

`NEXT_PUBLIC_DEMO_ONLY=1` — a **static export running the Fleet in the browser**. It does
not talk to a ground station and it has no access to any classroom's Logbook.

That is correct and intended, not a limitation to fix: the Vercel copy is a preview anyone
can open, and the classroom laptop is the real thing (ADR-0005, ADR-0002). Do not "improve"
this by pointing the deployment at live telemetry.

## Environment

Optional, set in the Vercel project, not in the repo:

| Variable | Effect if missing |
|---|---|
| `LOGBOOK_SYNC_SECRET` | The Logbook cloud copy simply does not happen. The board works. |
| `BLOB_READ_WRITE_TOKEN` | Same. |

Neither is required for a deployment to succeed. Never commit either.

## What must never be deployed

- Anything with a red gate or red CI.
- Real pupil names in a fixture, a test, or a seed. The deployed copy is public.
- A stream URL, a school address, or a `LOGBOOK_SYNC_SECRET` in committed code.
