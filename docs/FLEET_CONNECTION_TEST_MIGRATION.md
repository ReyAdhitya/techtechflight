# Fleet connection test migration plan

Prerequisite for ADR-0010 (retiring `dashboard/`). Planning artifact only — no production
code changes are proposed here, and none should be made until Phase 6.

## Why this exists

`dashboard/src/fleet-connection.test.ts` holds 14 tests. `web/lib/` holds none — its only
tests are `vitals.test.ts`, `logbook.test.ts` and `vercel-routing.test.ts`. Deleting
`dashboard/` without porting them would remove the only guarantee that the board reconnects
by itself.

The gap is worse than a straight port, because `web/lib/fleet-connection.ts` is a **superset**
of the version those tests were written against. It also captures `fleet-history` and folds
`fleet-events` into it, keyed by id. That merging is what stops a Teacher seeing this
morning's fault twice when the socket blinks, and it is tested nowhere at all.

So this is two pieces of work: a port, and new coverage for behaviour that has never had any.

## API delta between the two modules

Everything the existing tests touch is unchanged:

| Surface | Status |
|---|---|
| Constructor options (`url`, `clock`, `createSocket`, `backoffMs`) | Identical |
| `FleetSocket` interface | Identical |
| `snapshot`, `subscribe`, `start`, `stop` | Identical |
| Reconnection, backoff, retention, malformed-frame handling | Identical |
| `FleetSnapshot` | **Adds** optional `history?: FleetHistory \| null` |
| Message handling | **Adds** `fleet-history` and `fleet-events` branches |
| `#update` identity check | **Adds** `history` to the compared fields |

Two adaptations follow from that, and nothing else does:

1. **Import style.** `dashboard/` uses `'./fleet-connection.ts'` with an explicit extension.
   `web/` tests use extensionless relative imports (`'./logbook'`) and
   `'@techtechflight/contract/fixtures'`. The port takes the `web/` convention.
2. **`history` is `undefined`, not `null`, before anything arrives.** The initial snapshot
   is `{ connection: 'connecting', state: null, receivedAt: null }` with no `history` key at
   all. Any assertion about "no timeline yet" must expect `undefined`. This is deliberate —
   `FleetSnapshot.history` is optional precisely so a ground station running without a
   recorder degrades to no timeline rather than to a broken screen.

## Part 1 — the port

All 14 port. Twelve are verbatim once the imports change; two need a one-line adjustment.

| # | Test | Verdict |
|---|---|---|
| 1 | starts out connecting, with nothing to show yet | Verbatim |
| 2 | goes live once the ground station accepts | Verbatim |
| 3 | shows the Fleet as soon as the first snapshot arrives | Verbatim |
| 4 | ignores a malformed frame rather than blanking the board mid-lesson | Verbatim |
| 5 | reports the ground station unreachable, distinct from any Drone being Offline | Verbatim |
| 6 | keeps the last known Fleet on screen while it is away | Verbatim |
| 7 | reconnects by itself after the first backoff, with no Teacher involvement | Verbatim |
| 8 | backs off further on each failed attempt | Verbatim |
| 9 | holds at the longest backoff rather than growing without limit | Verbatim |
| 10 | goes back to live and resets its backoff once it reconnects | Verbatim |
| 11 | replaces the Fleet with whatever the ground station says on reconnecting | Verbatim |
| 12 | stops retrying once stopped | Verbatim |
| 13 | closes the socket it holds | Verbatim |
| 14 | notifies subscribers as the connection changes | **Adjust** — see below |

**Test 14** asserts `seen.map(s => s.connection)` equals `['live', 'unreachable']`. In `web/`
a `fleet-history` or `fleet-events` frame also publishes a snapshot, so this assertion is
only stable as long as the scenario sends neither. It does not, so it passes unchanged — but
it passes *by accident*. The port should assert against connection transitions explicitly
rather than against the full notification sequence, so a future history frame does not break
a test about connection state.

**Test 4** should gain a sibling rather than change: `web`'s `parse()` also rejects a frame
whose `type` is not one of the three known kinds. That is real behaviour with no test.

### Harness changes

`FakeSocket` ports as-is and gains two methods, mirroring what the ground station sends:

```
deliverHistory(history)  → { type: 'fleet-history', history }
deliverEvents(events)    → { type: 'fleet-events', events }
```

`deliver(state)` and `deliverRaw(data)` are unchanged. `TestClock` from
`@techtechflight/contract/testing` is already the mechanism — reconnection is time-driven and
must never be tested by sleeping.

## Part 2 — new coverage

This is the part that matters. Each of these covers behaviour that ships today with no test.

| Proposed test | Why it matters |
|---|---|
| stores the history the ground station sends on connect | The base case. Nothing asserts the timeline arrives at all. |
| folds streamed events into the history already held | The whole point of the merge. A screen reads one list, not a snapshot stitched to a stream. |
| does not show this morning's fault twice when the socket blinks | **The one to write first.** A reconnect replays the full history; ids are derived from the transition, and de-duplication by id is what makes replay safe. |
| keeps events in the order they happened, whatever order they arrive in | `mergeEvents` re-sorts by `at`. Untested. |
| keeps the battery samples when only events arrive | `mergeEvents` spreads `...base`. A regression here silently empties the charge history — which is what the Tower's endurance forecast is projected from, so the failure would surface as a wrong number rather than as a missing one. |
| starts a history from the first event when none has arrived yet | `since` falls back to `incoming[0]?.at ?? 0`. Defines what "how far back this is trustworthy" means in that case. |
| forgets the oldest events rather than growing without limit | `MAX_RETAINED_EVENTS = 500`. Same class of bug as an unbounded backoff. |
| shows no timeline, rather than breaking, when the ground station sends no history | The documented graceful-absence rule. Asserts `history` is `undefined`. |
| ignores a frame whose type it does not know | Sibling to test 4 above. |
| does not notify subscribers when nothing actually changed | `#update` compares `history` by identity. Without this, every frame would re-render every screen. |

Ten new tests, bringing `web/lib/fleet-connection.test.ts` to 24.

## Sequence, and how each step is verified

1. Create `web/lib/fleet-connection.test.ts` with the harness and the 14 ported tests.
   *Verify:* `npm test` — 223 → 237 passing, no production file touched.
2. Adjust test 14's assertion and add the unknown-type sibling.
   *Verify:* both fail if `parse()`'s `known.includes` guard is removed.
3. Add the 10 new tests.
   *Verify:* 237 → 247. Each new test must be shown to fail against a deliberately broken
   copy of the behaviour it covers — a test that passes against both the correct and the
   broken implementation is not coverage.
4. Only then does ADR-0010's removal step become safe.

Steps 1–3 stand on their own merit and should land even if `dashboard/` survives. They close
a real gap in the shipping board.

## Explicitly out of scope

No change to `web/lib/fleet-connection.ts`. If a test cannot be written without changing the
production module, that is a finding to report rather than a licence to edit — it would mean
the module has a seam problem, which belongs in Phase 4, not here.
