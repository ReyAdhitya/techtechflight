# The records get a database, and the browser stays the record

TechTech Flight gets a Postgres database, hosted on Neon, holding a copy of the Lesson and
Student records. **The browser remains the record.** The database is a copy, and every screen
that writes a record writes it to `localStorage` first and succeeds whether or not the network
is there.

This reverses a line that has been in `CLAUDE.md` since the Logbook was written:

> Do not invent a Postgres school DB.

The owner has reversed it. This ADR records what the reversal takes on, because the cost is
not technical.

## What the old line was protecting

Three things, and two of them still stand:

1. **A school hall with poor wifi still has to teach a lesson.** A Teacher who cannot mark
   attendance because the connection dropped is a real failure with thirty children in the
   room and a drone in the air. This is why the browser stays the record.
2. **Telemetry is not a record.** Altitude, battery and position are what is happening; the
   records hold what happened. Nothing live goes in the database, and that line is the same
   one the product already draws between the board and the Logbook.
3. **Central records of children are a different kind of thing from a file on a laptop.** This
   is the one the reversal actually spends, and the rest of this ADR is about it.

## What a central database takes on

A laptop-only product has a short answer to almost every question a school will ask about
data: *it is on your laptop, and it goes where your laptop goes*. That answer covers retention,
access, deletion, breach, transfer, and who else can see it, in one sentence a head teacher can
repeat to a parent.

Once a copy of the same records sits on a server this project controls, none of those questions
has that answer any more. Specifically:

- **A subject access request now has two places to look.** A parent asking what is held about
  their child is asking about the laptop *and* the copy, and the copy has to be able to produce
  the same answer.
- **Deletion has to reach both.** A child leaving the school, or a school leaving the product,
  means rows removed from the database, not only a cleared browser. A copy that outlives the
  record is the failure mode this creates.
- **There is now a breach surface that did not exist.** One laptop stolen is one class. One
  database is every class that ever synced.
- **Somebody is the data controller and somebody is the processor**, and until this change
  there was arguably only one party. A school signing up needs to know which it is and what the
  other has agreed to.
- **It has to be in the right place.** UK schools will ask where the rows physically are.

None of these is a reason not to do it. They are the bill, and this ADR is the record that the
bill was seen before it was run up.

## The sentence a school is told

It was:

> The records are on your own laptop. Nothing leaves the building.

It is now:

> **The records live in this browser, on this laptop, and that copy is the one the lesson
> runs from — it works with the wifi off.** When you turn on syncing, a second copy is kept on
> our server so you can open the same records from another machine and so they survive a lost
> laptop. The copy holds what happened in lessons: who flew, which drone, which points they
> reached, attendance and your notes. It never holds live flight readings. You can turn syncing
> off, and you can ask us to delete the copy, and the laptop keeps working either way.

That sentence is longer than the one it replaces, and it has to be. The short one was doing
work the product no longer does.

## Why Neon

Free, no card, and — the deciding property — it **wakes itself on the next request** rather
than waiting for a human to click a button in a dashboard. That is the same requirement that
sent the classroom store to Cloudflare Workers (ADR-0034's neighbour, `workers/classroom`): a
store that needs somebody to notice it is asleep is a store that is down on Tuesday morning.

Checked 2026-08-12: 0.5 GB per project, 100 compute-hours a month, sleeps after 5 minutes idle
and resumes in about half a second. Supabase was refused for the pause-and-wait behaviour, not
for anything else.

Half a second on the first request of the morning is a real cost and it is affordable **because
the browser is the record**: nothing a Teacher does waits on it.

## What goes in it

`db/schema.sql`, in third normal form. Three tables look like over-normalisation and are not;
the reason is written beside each one:

- **`zone_point`** — a polygon is an ordered list, and folding it into `zone` as JSON puts a
  repeating group in a column. It also loses the ordinal, and a No-fly Zone whose corners come
  back in a different order is a different shape.
- **`team_member`** — a team has many children and a child can be moved between teams within a
  lesson. Either side folded into the other loses one of those.
- **`checkpoint_reached`** — which points a child reached is a set with a time on each, in **any
  order**, because a Student flying by hand goes to whichever point is nearest. A count on the
  seat loses which ones; an index calls out-of-order flying a failure.

**No live readings.** No altitude, no battery, no position of a drone. Checkpoint and zone
coordinates are in there because they are what a Teacher *set*, not what an aircraft reported.

## When this ADR is wrong

If the sync turns out to be used by nobody — if every school runs one laptop and never opens
the records anywhere else — then this bought a compliance surface for nothing, and the right
move is to delete the copy and go back to the short sentence.
