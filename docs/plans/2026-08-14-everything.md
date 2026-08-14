# Everything, as one prompt

Every decision taken with the product owner between 6 and 14 August 2026, in one place, as one
coder prompt. Written because the plans had spread across fourteen files and a coder cannot
hold fourteen files in their head.

The fourteen originals stay in `docs/plans/` as the reasoning. **This is the instruction.**

---

## The state of play in six lines

- The Teacher's twelve steps, the Student's twelve screens, and classroom join all **ship and
  work**. A phone joined a live classroom over the internet on 2026-08-12
- The board runs on **Cloudflare**, because the owner's ISP blocks `vercel.app`
- The classroom store is a **Durable Object per room**, because Vercel Blob was suspended for
  inactive billing and KV's free ceiling was 1,000 writes a day
- **1,701 tests pass**, and every serious defect this fortnight got past them
- The owner's engineer has **an unpushed fix** that everything else depends on
- The owner's boss requires a **third normal form database**

---

## The prompt

```
You are the engineer on TechTech Flight, a ground station board a school
teacher uses to run a class of drones. Repo: D:\techtechflight.

Read first: HANDOFF.md, CLAUDE.md, CONTEXT.md, docs/DESIGN.md,
docs/DELIBERATE-POSITIONS.md. The reasoning behind everything below is in
docs/plans/; this prompt is the instruction.

TWENTY ITEMS, ONE BRANCH, IN THIS ORDER. The order is what stops it
collapsing. DO NOT STOP TO ASK QUESTIONS: every decision has been made by the
product owner and is written here. If you meet an ambiguity genuinely not
covered, choose whichever option puts FEWER WORDS on a Teacher's or a
Student's screen, record it in docs/DECISIONS.md, and continue.

WHY THIS LIST EXISTS. Almost every item came from the owner holding the
product on a laptop, an iPad and an iPhone. Not one was findable by reading
code, and all of them survived a green suite. Treat that as the standard the
work is judged against.

═══════════════════════════════════════════════
GROUP A. THE THINGS THAT STOP IT WORKING AT ALL
═══════════════════════════════════════════════

1. PUSH THE CLASSROOM-CODE FIX FIRST.
   It is fixed on the engineer's machine and not on origin/main. openClassroom
   compared `existing.lessonId === input.lessonId`, and two runs with no
   Logbook Lesson behind them both carry null. `null === null` is true, so a
   new Lesson inherited a finished one's code, every device read a classroom
   marked endedAt, and a phone was told "no classroom with that code" while
   the board said LESSON UNDER WAY. The plan said "a new Lesson mints a new
   code"; what shipped was "a new lessonId mints a new code". Everything below
   builds on this.

2. THE GLITCH, AND IT IS ONE BUG WITH TWO FACES.
   A Student taps a Drone, the seat is written to the store, and the screen
   bounces straight back to the Drone picker. The Teacher's board never shows
   that Student either: joining as "kntl" left the board reading "Nobody is
   waiting". The seat is written and never read back. Fix the read, both
   sides. Until this works on two real devices nothing else on this list is
   worth looking at.

3. ONE CLASSROOM ACROSS EVERY TAB.
   Roles stay per tab, so /mission and /student can be open at once, which the
   owner needs to test both sides. What must be shared is the Lesson and its
   code, which two tabs disagree about today.

═══════════════════════════════════════════════
GROUP B. THE TEACHER'S SET-UP
═══════════════════════════════════════════════

4. SKIP REMEMBERS. The Warm-up countdown returns every time a Teacher goes
   back to step 1, even after Skip. Skipped once is skipped for that Lesson.

5. PRE-FLIGHT ALWAYS PASSES IN SIMULATION. No "Motion sensor needs
   recalibrating" or "Altitude hold is not ready" on a Drone that does not
   exist. A simulated Fleet that fails its own check teaches a Teacher
   nothing and stops a demo dead.

6. TICK-ALL CLEARS PROPELLERS ON EVERY DRONE IN ONE TAP.
   Six of the seven pre-flight items read themselves from Telemetry;
   Propellers is the only human tick, because the board cannot see a chipped
   blade. The tedium is doing that one tick per aircraft. A Teacher walks the
   bench with their eyes, then taps once. Give the rules list a tick-all too.

7. BOOKMARK AND NOTE INCIDENT MOVE TO STEP 10.
   They sit on step 1 today, where there is no moment to bookmark and no
   incident to note.

8. DELETE "CHANGE THE SET-UP". The rail already holds steps 1 to 5, always
   visible and always tappable. It is a second door into a room that has one.

9. NO-FLY ZONES ARE OPTIONAL, and the blue boundary box is deleted.
   A Teacher in a netted cage should not be forced to draw a box.
   CRITICAL: with the boundary gone the map has no scale, so a Drone at the
   netting looks like one in the middle. Label the grid in metres instead.

═══════════════════════════════════════════════
GROUP C. THE DATABASE
═══════════════════════════════════════════════

10. WRITE THE ADR BEFORE ANY SCHEMA.
    CLAUDE.md's "do not invent a Postgres school DB" is reversed by the owner.
    The ADR must say what the reversal takes on: central records of children
    bring obligations a laptop-only product does not have. The sentence a
    school used to be told, "the records are on your own laptop, we never hold
    them", stops being true. Write the sentence that replaces it.

11. BUILD THE SCHEMA AS WRITTEN. Seventeen tables in third normal form, with
    the CREATE TABLE statements, already in
    docs/plans/2026-08-12-the-store-the-database-and-large-format.md. The
    three awkward-looking tables are deliberate: zone_point, team_member and
    checkpoint_reached each exist because folding them into their parent loses
    information.

12. HOST ON NEON. Free, no card, and it wakes itself on the next request
    rather than waiting for a human to click, which is why it and not
    Supabase. Checked 2026-08-12: 0.5 GB per project, 100 compute-hours a
    month.

13. THE BROWSER STAYS THE RECORD; THE DATABASE IS THE COPY. A school hall with
    poor wifi still has to teach a Lesson, and a Teacher who cannot mark
    attendance because a connection dropped is a real failure with children in
    the room. logbook-sync already half implements this shape.

14. NO LIVE READINGS IN IT. No altitude, no battery, no position. It holds
    what happened, never what is happening.

15. THE RECORDS SCREEN IS TWO SCREENS: a class list, and one child's history.
    Records answer two questions and no more. Layout is in the same document.

═══════════════════════════════════════════════
GROUP D. CARRIED FORWARD, NOT YET BUILT
═══════════════════════════════════════════════

16. THE SCOPE'S LEGEND MUST NOT NAME WHAT IS NOT DRAWN. At 390 on step 7 the
    key read "Hatched = No-fly Zone" while the zone sat outside the window.
    Flagged in the 2026-08-10 review and correctly left out of scope then.

17. LessonScreen READS THE TEAM LIST ONCE PER RENDER, so getting a team onto
    the Mission needs a page reload before "Put these craft on the Mission"
    appears. Flagged twice and still open.

18. THE LOGBOOK SYNC IS STILL ON THE SUSPENDED VERCEL BLOB. It is records
    rather than the live classroom, so it blocks nothing today, but it is
    dead and either moves with the classroom store or is replaced by item 11.

19. A SAVED THEME DOES NOT SURVIVE HYDRATION, and React #418 fires on every
    role-gated route because RoleGate reads localStorage during render. Both
    predate all of this and have been out of scope three times. Fix them here
    or say why not.

20. web/type-scale.test.ts AND web/standards.test.ts EXIST TO STOP A MISSING
    PASS READING AS A CLEAN ONE. Keep them honest: if you add a class of
    defect they could catch, teach them to catch it.

═══════════════════════════════════════════════
RULES THAT DO NOT BEND
═══════════════════════════════════════════════

- Students never get a Command. Land, Hover, Recall, Auto-land and Stop belong
  to the Teacher, always. ADR-0011 and ADR-0021.
- Exactly two pressable things in the Student app during a Mission: Ask to
  take off, and Understood. Joining and leaving are not Mission presses.
- Phases come from records and Telemetry, never from a button press.
- No GPS and no map tile. Metres from the Fleet's own origin, ADR-0019.
- No invented readings. An absent value is said in words, never a zero and
  never a dash. A frozen screen is the same defect at whole-screen scale.
- Nothing is airborne that a Teacher did not clear. A Drone with no Student on
  it never flies and never enters the clearance queue.
- Recall is for trouble, never for ending a normal flight. The Teacher
  approves, the tablet says come home, the child flies it home.
- Roles are two secrets, not a preference: the classroom code is public and
  read out loud, the Teacher PIN is private. The address decides the role for
  a tab.
- No em dashes and no middots in on-screen copy. Rewrite the sentence; commit
  898af04 broke a build deleting characters.
- Semantic tokens only. A px font-size is a defect, ADR-0008.

═══════════════════════════════════════════════
HOW TO WORK, AND HOW TO PROVE IT
═══════════════════════════════════════════════

Own git worktree. One branch. Conventional commits, one logical change each:
if the subject needs the word "and", it is two commits. Rebase, do not squash.
Update docs/CHANGELOG.md and docs/DECISIONS.md and add anything non-obvious to
the CLAUDE.md Gotchas.

THE GATE is npm test and npm run typecheck. There is no lint.

PROVE IT ON TWO DEVICES, NOT IN A TEST. Join from a phone, tap a Drone, stay
in it, and see that name appear on the Teacher's board. Then end the Lesson,
start another, and confirm the code changes and the phone can join the new one
first try.

SHOOT EVERY SCREEN AT 390 BEFORE 1280. Build with NEXT_PUBLIC_DEMO_ONLY=1,
then scripts/shot.mjs from PowerShell, not Git Bash. TTF_SHOT_ROLE seeds the
board role; without it you are photographing the door. Reviewing at 1280 first
is the mistake that let twenty one defects through.

DEPLOYING THE CLOUDFLARE COPY, which is the one the owner tests on because
their ISP blocks vercel.app:
  NEXT_PUBLIC_DEMO_ONLY=1 npm run build --workspace=web
  printf '_next/static/media/ort-wasm*.wasm\nort/*.wasm\nmodels/*.onnx\n' \
    > web/out/.assetsignore
  cd classroom-worker && wrangler deploy -c site.toml
The .assetsignore is required: the ONNX runtime is 26 MB and Cloudflare caps
assets at 25 MB.

Open one PR at the end saying which of the twenty are done and which, if any,
you consciously left and why.
```

---

## What the front end reviewer is for, and when to skip it

**The coder reads the code. The reviewer uses the screens.**

Every serious defect of the last fortnight came from someone *using* the product: drones
airborne before anyone cleared them, a no-fly alarm that had never once fired, a Recall that
landed 8.5 m from where the map promised, a Student screen that scrolled 856 px sideways on a
phone. The suite was green through all of them.

**Skip it for items 1 to 9.** The owner found those by using the product and will know within a
minute whether they are fixed.

**Do not skip it for items 10 to 15.** A database is code you cannot see, and a wrong schema is
expensive to unpick later.

The reviewer prompt is in `docs/plans/2026-08-09-round-two-prompts.md`. One rule in it earns
its place above all others:

> Run the path to the end before calling anything stop-the-line. On 2026-08-07 a review
> reported that a Teacher's grant never reaches the Student tablet, because ControlScreen built
> a value and appeared to discard it. The write happens two calls deeper, and the threading
> itself is load-bearing. That finding was wrong, was reported as verified, and nearly caused
> correct code to be deleted.

---

## Where the reasoning lives, if a decision is questioned

| Question | File |
|---|---|
| Why the rail exists at all | `2026-08-07-rail-rebuild-handover.md` |
| The twenty five fixes and the two ADRs | `2026-08-09-one-prompt-all-waves.md` |
| What holding it on a tablet found | `2026-08-09-the-eight-from-the-tablet.md` |
| Why the demo must behave like a real lesson | `2026-08-09-make-the-demo-real.md` |
| Leaving a classroom, and the air in order | `2026-08-10-classrooms-and-the-air.md` |
| The review that found the lying Recall | `2026-08-10-review-of-the-twenty-one.md` |
| The cloud, the colours, and the invisible zone | `2026-08-11-the-cloud-the-code-and-the-colours.md` |
| Two tabs, and looking back | `2026-08-11-two-tabs-and-looking-back.md` |
| The store, the database, and Large format | `2026-08-12-the-store-the-database-and-large-format.md` |
