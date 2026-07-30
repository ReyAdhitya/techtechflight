# Dual-write Logbook: static board + Vercel Serverless copy

Amends ADR-0005.

## Context

ADR-0005 keeps `web/` as a Next.js **static export** so the ground station can serve
`web/out` with no UI server (ADR-0002). Owner #93 / plan #83 asks for a **cloud copy** of
the Logbook on Vercel so the hosted preview is not stuck with empty `localStorage`.

## Decision

1. **`web/` stays `output: 'export'`.** No Next.js Route Handlers in the board app.
2. **Sync is a root Vercel Serverless Function** at `/api/logbook` (repo `api/logbook.ts`),
   beside the static `web/out` deploy. Storage is **Vercel Blob** (private object).
3. **Write order:** localStorage first; debounced PUT when a sync secret is present and
   the network answers. Offline classroom unchanged.
4. **Read path:** board with secret hydrates from GET when cloud `updatedAt` ≥ local
   `revisedAt` (last-write-wins).
5. **Auth:** shared secret `LOGBOOK_SYNC_SECRET` (server) matching the Teacher’s Settings
   secret / `NEXT_PUBLIC_LOGBOOK_SYNC_SECRET`. Unauthorized requests get 401 — pupil names
   are not public on the preview URL.

## Consequences

- Classroom ground-station builds stay static; no API required on :4321.
- Vercel project needs `LOGBOOK_SYNC_SECRET` and `BLOB_READ_WRITE_TOKEN`.
- Multi-Teacher merge, CRDT, and SIS remain out of scope.
- ADR-0005’s “board must never acquire a server” now means **the Next app** does not —
  a separate serverless function may hold the Logbook copy.
