# The Vite dashboard is retired, and the ground station serves the Next.js board

Completes [ADR-0005](./0005-nextjs-for-the-board-only.md) rather than superseding it.
That ADR ended: *"`dashboard/` is deleted once `web/` is better."* This records that the
condition is met, what the evidence is, and the one thing that has to happen first.

`dashboard/` is removed. `ground-station/src/main.ts` serves `web/out` instead of
`dashboard/dist`.

## Why now

Two boards have been maintained in parallel through the transition, which `vitest.config.ts`
still describes as being under way. It is not. `web/` has Tower, Lesson, History,
Maintenance, Settings, the command palette, and the whole vitals engine. `dashboard/` has
the Fleet board and nothing else, and will never gain the rest.

The transition state has also produced a defect that is worse than the duplication. The
ground station resolves `../../dashboard/dist` and serves it when present, so a School
running the real product gets the **older** board — no Tower, no Lesson, no History, no
Maintenance. Every screen built for the oversight work is currently reachable only from the
Vercel demo, which by design has no ground station behind it. Two boards is untidy; serving
the wrong one is a product failure.

## The evidence that nothing is lost

Recorded in full as Appendix A of [`../CODEBASE_AUDIT.md`](../CODEBASE_AUDIT.md). In short:

- **All 35 of `dashboard`'s `FleetBoard` tests have an identically-named counterpart in
  `web`** — one for one, not merely comparable coverage. `web` adds 8 beyond them.
- `age.ts` and `status-presentation.ts` are byte-identical between the two.
- `battery.ts`, `theme.ts` and `display-scale.ts` differ only in that `web`'s have evolved
  further; nothing in `dashboard`'s versions is absent from `web`'s.
- `web`'s `FleetConnection` is a strict superset. `dashboard`'s `FleetBoard` is a strict
  subset — no search, no filter, no demo labelling, no empty-Fleet state.
- Every shared component in `web` is larger and drops no behaviour.

The 916 lines of hand-written CSS are replaced by Tailwind v4 and `app/globals.css`. That is
a different technique for the same result, not a lost feature.

## The one thing that is not replaced

`dashboard/src/fleet-connection.test.ts` has 14 tests. `web/lib/` has none. Those tests are
the only guarantee that the board reconnects by itself — backoff growth, the hold at the
longest delay, the reset on reconnect, retention of the last Fleet across the gap, and the
refusal to blank on a malformed frame.

And `web`'s connection module carries two behaviours the `dashboard` one never had — history
capture, and id-keyed event merging across a reconnect — which are tested nowhere at all.
The de-duplication that stops a Teacher seeing this morning's fault twice after the socket
blinks is, today, unverified in the board that ships.

So the removal is gated on [`../FLEET_CONNECTION_TEST_MIGRATION.md`](../FLEET_CONNECTION_TEST_MIGRATION.md):
port the 14, add 10 more for the untested superset, and only then delete anything.

## Considered options

**Keep both.** Rejected. The duplication is not free — fifteen modules exist twice and have
already begun to diverge, and every future change to a shared concept has to be made in two
places or silently made in one. The audit found exactly that drift in `battery`, `theme` and
`display-scale`.

**Keep `dashboard/` as a reference implementation.** Rejected. An unmaintained reference is
worse than none: it stops being true and nobody notices, and the next person to read it
cannot tell which of the two boards is the intended design. If a smaller board is ever wanted
for its own sake, that is a new decision made deliberately, not a fossil kept out of caution.

**Delete now and port the tests afterwards.** Rejected. It would leave the shipping board's
reconnection behaviour unverified for however long "afterwards" turns out to be, and
reconnection is the one thing a Teacher can neither notice nor fix themselves.

## Consequences

`ground-station/src/server.ts` keeps serving a static directory; only the path changes, and
`dashboardDir` should be renamed to match what it now points at. The deployment story
survives intact — one process, one port, the board served beside the socket, no internet
required (ADR-0002).

The workspace, its Vitest project, and its dependencies go. The net test count moves roughly
sideways: 49 removed with `dashboard/`, 24 added in `web/lib/fleet-connection.test.ts` — but
the 24 cover code that actually ships, and 10 of them cover behaviour that had none.

`vitest.config.ts`'s comment about two boards existing during a transition stops being true
and should go with them. ADR-0003's title — *"we are not using Next.js"* — finally matches
the repository again, on the reading ADR-0005 gave it.

The Vite toolchain leaves the repository. Any future need for a build without the Next
toolchain would have to start again rather than resume.

## When this ADR is wrong

If `web/` ever needs a server, ADR-0005 breaks before this one does, and this decision would
have to be revisited alongside it. It would also be wrong if a School turned out to need a
board on hardware that cannot run the Next output — which nothing currently suggests, since
both produce static files served the same way.
