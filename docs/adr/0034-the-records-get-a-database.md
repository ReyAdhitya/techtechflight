# The records get a database, and the browser stays the record

TechTech Flight gets a Postgres database, hosted on Neon, holding a copy of the Lesson and
Student records. **The browser remains the record.** Every screen that writes a record writes
it to `localStorage` first and succeeds whether or not the network is there.

This reverses a line that has been in `CLAUDE.md` since the Logbook was written:

> Do not invent a Postgres school DB.

The owner has reversed it. What follows is what the reversal takes on, because the cost is not
technical and will not be found in the code.

## What the old line was protecting

Three things. Two of them still stand.

1. **A hall with poor wifi still has to teach a Lesson.** A Teacher who cannot mark attendance
   because a connection dropped is a real failure with thirty children in the room and a drone
   in the air. This is why the browser stays the record, and it is not negotiable.
2. **Telemetry is not a record.** Altitude, battery and position are what is happening; the
   records hold what happened. Nothing live goes in the database.
3. **Central records of children are a different kind of thing from a file on a laptop.** This
   is the one the reversal actually spends.

## What a central database takes on

A laptop-only product has a short answer to almost every question a school asks about data:
*it is on your laptop, and it goes where your laptop goes*. That one sentence covers retention,
access, deletion, breach, transfer, and who else can see it, and a head teacher can repeat it
to a parent without checking anything.

Once a copy of the same records sits on a server this project controls, none of those questions
has that answer. Specifically:

- **A subject access request now has two places to look.** A parent asking what is held about
  their child is asking about the laptop *and* the copy, and the copy has to be able to answer.
- **Deletion has to reach both.** A child leaving the school, or a school leaving the product,
  means rows removed from the database and not only a cleared browser. A copy that outlives the
  record is the failure this creates.
- **There is a breach surface that did not exist.** One laptop stolen is one class. One database
  is every class that ever synced.
- **Somebody is the data controller and somebody is the processor**, and until now there was
  arguably only one party. A school signing up has to be told which it is.
- **It has to be somewhere.** UK schools will ask where the rows physically are, and "a server"
  is not an answer.

None of these is a reason not to do it. They are the bill, and this ADR is the record that the
bill was read before it was run up.

## The sentence a school is told

It was:

> The records are on your own laptop. We never hold them.

It is now:

> **The records live in this browser, on this laptop, and that copy is the one your lesson runs
> from. It works with the wifi off.** If you turn syncing on, we keep a second copy on our
> server so you can open the same records from another machine and so they survive a lost
> laptop. That copy holds what happened in lessons: who flew, which drone, which points they
> reached, attendance, and your own notes. It never holds live flight readings. You can turn
> syncing off, and you can ask us to delete the copy, and your laptop keeps working either way.

It is longer than the sentence it replaces, and it has to be. The short one was doing work the
product no longer does.

## Why Neon

Free, no card, and — the deciding property — it **wakes itself on the next request** rather
than waiting for a human to click a button in a dashboard. That is the same requirement that
sent the classroom store to Cloudflare: a store that needs somebody to notice it is asleep is a
store that is down on Tuesday morning. Supabase was refused for the pause-and-wait behaviour
and for nothing else. 0.5 GB per project and 100 compute-hours a month, checked 2026-08-12.

The first request of a morning pays for the wake, and that is affordable **because the browser
is the record**: nothing a Teacher does waits on it.

## What goes in it

`db/schema.sql`, seventeen tables in third normal form, exactly as set out in
`docs/plans/2026-08-12-the-store-the-database-and-large-format.md`. Three look like
over-normalisation and are not:

- **`zone_point`** — a zone has many corners. `corner1, corner2, corner3` breaks the moment
  somebody draws four, and the ordinal stops being a first-class thing; a No-fly Zone whose
  corners come back in a different order is a different shape.
- **`team_member`** — a team holds several students and a student joins several teams across a
  year. Neither side can hold the other.
- **`checkpoint_reached`** — it records *when*. "3 of 5" on the flight throws away which three,
  and a child flying by hand goes to whichever point is nearest.

`criterion_result` hangs off `flight` rather than `mission`, so two teams flying the same
Mission score differently, which is the point of scoring.

**No live readings.** No altitude, no battery, no position. Coordinates appear only on
`zone_point` and `checkpoint`, and those are what a Teacher *set*, not what an airframe
reported.

## When this ADR is wrong

If the sync turns out to be used by nobody — every school on one laptop, never opening the
records anywhere else — then this bought a compliance surface for nothing, and the right move
is to delete the copy and go back to the short sentence.
