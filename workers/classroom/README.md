# The classroom store

One JSON document per classroom code, on Cloudflare Workers + KV. `GET` and `PUT` by
`?code=`, no secret — the four characters a Teacher shouts across the room are the key.

This replaces `api/classroom.ts`, which still works and is still the fallback. The board
points at whichever is configured: set `NEXT_PUBLIC_CLASSROOM_SYNC_URL` to the Worker's URL
and it uses the Worker; leave it unset and it uses `/api/classroom` on Vercel.

## Why it moved

The Vercel Blob stores have answered 500 since 9 August 2026. They are suspended for inactive
billing and no payment method is being added. A classroom store that dies during a quiet
fortnight is not a classroom store.

## Why Workers and not Supabase

**It must never sleep and never wait for a human.** A free Supabase project pauses after about
a week idle and resumes only when somebody clicks a button in a dashboard, which on a Tuesday
morning with a class in the room is indistinguishable from being down. A Worker has no idle
state to come back from.

## Fitting the free tier

A classroom document is 5.42 KB. The free tier is 100,000 KV reads and 1,000 writes a day.
Tablets poll every 2.5 s, so thirty of them through a forty-minute lesson is about 29,000
reads — three lessons a day fits with room to spare. Writes are the scarcer side and the board
debounces them, so a busy lesson is dozens rather than hundreds.

Documents expire after two days without a write, so last week's lesson does not sit in the
store forever.

## First deploy

One command needs a human, because it opens a browser:

```
wrangler login
```

Then, from the repo root:

```
npm run classroom:namespace    # creates the KV namespace, prints its id
```

Put that id into `workers/classroom/wrangler.toml` under `kv_namespaces`, then:

```
npm run classroom:deploy
```

Wrangler prints the Worker's URL. Give it to the board:

- **Vercel:** set `NEXT_PUBLIC_CLASSROOM_SYNC_URL` to `https://<worker>.workers.dev` in the
  project's environment variables and redeploy.
- **This laptop:** put the same line in `.env.local` before `npm run build --workspace=web`.

The board appends `?code=XXXX` itself, so the value is the bare origin with no path and no
query.

## Checking it

```
curl https://<worker>.workers.dev/health
```

`{"ok":true,"store":"cloudflare-kv"}` means the store is up. The board asks the same question
and says which store answered, so a Teacher reading *Could not reach the classroom cloud*
learns which cloud and why.
