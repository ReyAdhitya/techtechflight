# Handoff, 2026-08-14

Written so a fresh agent can pick this up without re-deriving it. Read this, then `CLAUDE.md`,
then the plans in `docs/plans/`.

Replaces the 2026-08-06 handoff. What follows was verified against the code and against the
live deployments, not remembered.

## The product in one paragraph

A ground station for a school teacher running a class of drones. The Teacher drives a laptop;
the Students fly by hand with controllers and read a tablet. The customer supplied two
twelve-step workflow posters, one per side, and they mirror each other: the Teacher grants a
takeoff at their step 6 while the Student asks for it at their step 5. The product is those
two posters made real.

Owner's goal, in their words: easy, tidy, few words, straight to the point, guided without
being confusing.

## Where it runs, and this changed twice this week

| | |
|---|---|
| **Vercel** | `techtechflight.vercel.app`. **Blocked by the owner's ISP in Indonesia.** Unusable here without a VPN |
| **Cloudflare** | `techtechflight.classroom-worker.workers.dev`. **Reachable without a VPN.** The one the owner tests on |
| **Classroom store** | `techtechflight-classroom.classroom-worker.workers.dev`, a Durable Object per room. Deployed with an API token, not `wrangler login` |

**Deploying the Cloudflare copy**, from `classroom-worker/`:

```
NEXT_PUBLIC_DEMO_ONLY=1 npm run build --workspace=web
printf '_next/static/media/ort-wasm*.wasm\nort/*.wasm\nmodels/*.onnx\n' > web/out/.assetsignore
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=0da85c3d839736debe1fb98791b190c8 \
  wrangler deploy -c site.toml
```

The `.assetsignore` is required: the ONNX runtime is 26 MB and Cloudflare caps assets at 25 MB.
Vision does not work on the Cloudflare copy as a result, and that is accepted.

## What broke this week, and why each one mattered

Every one of these was found by **using** the product. None was caught by 1,701 passing tests.

1. **Vercel Blob suspended for inactive billing.** All three stores at once. `/api/classroom`
   returned 500 for three days. Not a bug, and no code change could fix it.
2. **The store address was a build seed.** `NEXT_PUBLIC_CLASSROOM_SYNC_URL` only reached the
   deploy built with it, so every other build fell back to the dead Vercel route. It is now a
   built-in constant in `classroom-session.ts`, with a `localStorage` override.
3. **The heartbeat spent a day's store allowance in ninety minutes.** Every write pushed to
   the cloud twice, every ten seconds, forever, including after a Lesson ended. Now: one
   debounced write, cloud at most once a minute, and no beat at all once `live` is false.
4. **KV's 1,000 writes a day is per account.** Even fixed, the ceiling was too low, so the
   store is now a Durable Object per classroom code.
5. **A finished classroom outlived its Lesson.** `openClassroom` compared
   `existing.lessonId === input.lessonId`, and two runs with no Logbook Lesson both carry
   `null`. `null === null` is true, so a new Lesson inherited the dead one's code and every
   device read a classroom marked `endedAt`. **The engineer has fixed this and NOT PUSHED IT.**
6. **A new browser met a PIN prompt instead of the door.** Fixed: no remembered role now means
   `/enter`.

## Decisions that should not be re-litigated

**Students never get a Command.** Land, Hover, Recall, Auto-land and Stop belong to the
Teacher, always (ADR-0011, ADR-0021). Exactly two pressable things in the Student app: Ask to
take off, and Understood.

**Phases derive from records and Telemetry, never from a button.**

**No GPS, no map tile.** Metres from the Fleet's own origin (ADR-0019).

**No invented readings.** Absent is said in words, never a zero and never a dash.

**Roles are two secrets, not a preference.** The classroom code is public and read out loud;
the Teacher PIN is private. The address decides the role for a tab: `/mission` is the Teacher,
`/student` is the Student.

**Recall is for trouble, never for ending a normal flight.** The Teacher approves, the tablet
says come home, the child flies it home.

**A new Lesson mints a new code.** Decided 2026-08-10. See failure 5 above for what happens
when it does not.

## The ten fixes, in this order

The order is what stops it collapsing.

| # | What |
|---|---|
| 1 | **Push the engineer's classroom-code fix.** Nothing below works on top of a Lesson with an inherited code |
| 2 | **The glitch.** Tap a Drone, the seat is written, the screen bounces back to the picker. Same cause: the Teacher's board never reads seats back, so a Student who joined as "kntl" never appears. One bug, two symptoms |
| 3 | **One classroom across every tab.** Roles stay per tab |
| 4 | **Skip remembers.** The Warm-up returns on every visit to step 1 |
| 5 | **Pre-flight always passes in simulation.** No faults on Drones that do not exist |
| 6 | **Tick-all clears Propellers on every Drone in one tap.** Six of seven items read themselves; the tedium is doing the one human tick per aircraft |
| 7 | **Bookmark and Note incident move to step 10.** They sit on step 1 today, where there is no moment to bookmark |
| 8 | **Delete "Change the set-up".** The rail already holds steps 1 to 5 |
| 9 | **No-fly zones optional, blue boundary box deleted.** CRITICAL: with the box gone the map has no scale, so label the grid in metres or a Drone at the netting looks like one in the middle |
| 10 | **The database.** Last, because it fixes none of the above |

## The database

The owner's boss requires one, in third normal form. **This reverses `CLAUDE.md`'s "do not
invent a Postgres school DB"**, and the reversal is already recorded there with what it takes
on: the sentence a school used to be told, *"the records are on your own laptop, we never hold
them"*, stops being true and something must replace it.

**The schema, the reasoning and the `CREATE TABLE` statements are already written** in
`docs/plans/2026-08-12-the-store-the-database-and-large-format.md`. Seventeen tables. Show that
file to the boss; it answers the design question today without any code.

**Host on Neon.** Free, no card, and it wakes itself on the next request rather than waiting
for a human to click, which is why it and not Supabase. Free plan checked 2026-08-12: 0.5 GB
per project, 100 compute-hours a month.

**The browser stays the record; the database is the copy.** A school hall with poor wifi still
has to teach a lesson.

**No live readings in it.** No altitude, no battery, no position.

## Hazards

**Two terminals in one working directory** cost six commits on the wrong branch. Use worktrees.

**jsdom cannot see layout.** Every visual defect this week was found in a screenshot or on a
phone, never by a test. Shoot at 390 first, not 1280.

**`github.com` is intermittently unreachable** from the owner's laptop while `api.github.com`
works. A push can fail silently; `gh` keeps working, which disguises it.

**Both Cloudflare tokens are in the 2026-08-12 conversation and should be rotated.** Nothing
breaks: everything is already deployed and does not need them to run.

**`64UL` is a dead classroom code** still sitting in the store. It expires on its own.

## Still open, and only the owner can close them

- **The DNS record** for `flight.techtechtechnology.com`. The domain's zone is in a Cloudflare
  account the owner's tokens cannot reach; two tokens both reported zero zones
- **Which drone the school buys.** Decides the adapter, the network, and whether detection is
  ever possible
- **One real lesson.** Nothing here has been in front of a class

## The prompt

```
You are the engineer on TechTech Flight. Repo: D:\techtechflight.

Read first: HANDOFF.md, CLAUDE.md, CONTEXT.md, docs/DELIBERATE-POSITIONS.md.

Ten items, one branch, in the order below. Every decision is made; do not stop
to ask. If you meet an ambiguity genuinely not covered, choose whichever option
puts FEWER WORDS on a screen, record it in docs/DECISIONS.md, and continue.

1. PUSH THE CLASSROOM-CODE FIX FIRST. It is fixed on a machine and not on
   origin/main. openClassroom compared existing.lessonId === input.lessonId,
   and two runs with no Logbook Lesson both carry null, so a new Lesson
   inherited a finished one's code and every device read a classroom marked
   endedAt. Everything below builds on it.

2. THE GLITCH, and it is one bug with two faces. A Student taps a Drone, the
   seat is written to the store, and the screen bounces back to the Drone
   picker. The Teacher's board never shows that Student either: joining as
   "kntl" left the board reading "Nobody is waiting". The seat is written and
   never read back. Fix the read, on both sides.

3. ONE CLASSROOM ACROSS EVERY TAB. Roles stay per tab, so /mission and /student
   can be open at once. What must be shared is the Lesson and its code, which
   two tabs disagree about today.

4. SKIP REMEMBERS. The Warm-up returns every time a Teacher goes back to step
   1, even after Skip. Skipped once is skipped for that Lesson.

5. PRE-FLIGHT ALWAYS PASSES IN SIMULATION. No "Motion sensor needs
   recalibrating" on a Drone that does not exist.

6. TICK-ALL CLEARS PROPELLERS ON EVERY DRONE IN ONE TAP. Six of the seven items
   read themselves; Propellers is the only human tick and doing it per Drone is
   the tedium. A Teacher walks the bench with their eyes, then taps once.

7. BOOKMARK AND NOTE INCIDENT MOVE TO STEP 10. They are on step 1 today, where
   there is no moment to bookmark and no incident to note.

8. DELETE "CHANGE THE SET-UP". The rail already holds steps 1 to 5 and is
   always visible. It is a second door into a room that has one.

9. NO-FLY ZONES ARE OPTIONAL, and the blue boundary box goes.
   CRITICAL: with the box gone the map has no scale, so a Drone at the netting
   looks like one in the middle. Label the grid in metres instead.

10. THE DATABASE, last, because it fixes none of the above. Schema, reasoning
    and CREATE TABLE statements are already written in
    docs/plans/2026-08-12-the-store-the-database-and-large-format.md. Host on
    Neon. The browser stays the record and the database is the copy, because a
    hall with poor wifi still has to teach a Lesson. No live readings in it.

RULES THAT DO NOT BEND
- Students never get a Command (ADR-0011, ADR-0021).
- Exactly two pressable things in the Student app during a Mission.
- Phases from records and Telemetry, never a press.
- No GPS, no map tile. Metres from the Fleet's own origin (ADR-0019).
- No invented readings. Absent is said in words.
- No em dashes and no middots in on-screen copy.
- Semantic tokens only. A px font-size is a defect (ADR-0008).

PROVE IT ON TWO DEVICES, NOT IN A TEST. Join from a phone, tap a Drone, stay in
it, and see that name on the Teacher's board. Every defect this week survived a
green suite of 1,701 tests and was found by using the product. Shoot every
screen at 390 before 1280.

Gate is npm test and npm run typecheck. There is no lint.
```
