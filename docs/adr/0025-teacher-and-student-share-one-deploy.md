# Teacher and Student share one deploy, split at the door

## Status

Accepted — 2026-08-05

## Context

The boss said Students will use the web app too. The Teacher board already exists as a
static export on Vercel. A second deploy would split the classroom code story and force
two URLs to keep in sync. The Student Mission workflow (brief → request takeoff → fly →
score) needs the Teacher's clearances and Mission brief in the same period.

## Decision

One deploy. Opening the board asks **Teacher** or **Student** (`/enter`). Teacher chrome
stays under `(app)`. Student chrome lives at `/student` with no Land / Stop / Fleet nav.

They connect through a short **classroom code**. State is local first
(`techtechflight:classroom-session`), mirrored to `/api/classroom` (Vercel Blob) when the
store is configured, and kept honest across tabs with `BroadcastChannel`.

Grant takeoff on the Teacher board clears the matching Student seat. Students still fly by
hand (ADR-0021).

## Consequences

- Role is stored in `techtechflight:board-role` and is switchable from the header.
- Without Blob, phones only join on the same browser origin (demo / one laptop). With Blob,
  phones join from the room Wi‑Fi against the Vercel URL.
- Student UI is a phone-first Mission checklist, not a second Control board.
