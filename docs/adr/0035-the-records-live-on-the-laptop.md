# The records live on the laptop, and the cloud is switched off

The Lesson and Student records are a **SQLite file on the classroom laptop**, at
`Documents\TechTech Flight\records.db`, holding the eighteen tables of `db/schema.sql`. The
ground station writes it. The off-site copy is **off by default**: no account, no connection,
no credential, and a box in Settings for a school that wants one.

This reverses the half of
[ADR-0034](./0034-the-records-get-a-database.md) that made the browser the record.

## What ADR-0034 said, and why it was right at the time

> **The browser remains the record.** Every screen that writes a record writes it to
> `localStorage` first and succeeds whether or not the network is there.

The reasoning was that a hall with poor wifi still has to teach a Lesson, and a Teacher who
cannot mark attendance because a connection dropped is a real failure with children in the
room. **That reasoning is untouched.** What changed is the fact it rested on: the database was
in the cloud, so writing to it meant waiting on a network.

It is a file on the same machine now. There is no network to wait on, so the argument that made
the browser the record no longer selects the browser.

## What the file has that browser storage does not

- **Clearing browsing data destroys `localStorage`, silently and completely.** It is a routine
  thing for a school technician to do to a shared laptop, it is offered by name in every
  browser's settings, and nothing warns anybody that a term of attendance went with it. A file
  in `Documents` survives it, survives a browser upgrade, and survives somebody switching from
  Edge to Chrome.
- **A file can be copied.** A school protects what it cares about by copying it to a USB stick
  or a shared drive. There is no gesture for "copy my localStorage".
- **A file can be backed up by somebody who is not us**, with tools the school already runs.

## What the browser keeps

**The browser keeps its copy, and the board still works with the ground station closed.** A
Teacher planning next week's Lesson on the sofa is not doing anything wrong. When the two
disagree, **the file wins**, because it is the one a technician can back up and the one that
survives a cleared browser.

## What a school is told now

ADR-0034 replaced "the records are on your own laptop, we never hold them" with a longer
sentence about a copy on our server. That sentence is withdrawn. What replaces it:

> **Your children's records are a file on your own laptop**, in your Documents folder, next to
> everything else the school keeps. The lesson writes to it directly and it works with no
> internet at all, because nothing about the lesson leaves the room.
>
> **We do not hold a copy.** There is no account to make and nothing to sign. Settings has two
> buttons: one saves a dated copy of the records to your Desktop, for a USB stick or the school
> drive, and one exports them for a spreadsheet.
>
> If a school ever wants an off-site backup there is a box in Settings that turns one on. It is
> off until somebody ticks it, and until then nothing has ever been sent.

That is shorter than the sentence it replaces, and it is shorter because the product does less
with the data, which is the whole point of the change.

## What this gives back

ADR-0034 listed the bill a central database runs up: a subject access request with two places
to look, deletion that has to reach both, one breach surface covering every class that ever
synced, and an argument about who is controller and who is processor.

**Switching the cloud off pays all of it back** while the box is unticked. The obligations do
not vanish from the code — the Neon push stays in the tree — they vanish from the deployment,
which is where they were costing anybody anything.

## What does not change

**No live readings, ever.** No altitude, no battery, no position. The file holds what happened,
never what is happening. Coordinates appear only on `zone_point` and `checkpoint`, because those
are what a Teacher *set* rather than what an airframe reported.

**The ground station writes at Lesson boundaries**, never per telemetry tick. A file written
twice a second by a classroom of drones is a file that is being used as a log, and this is a
record.

## When this ADR is wrong

If a school loses a laptop and with it a term of records that nobody ever copied, the two
buttons were not enough and the answer is a backup that happens without being asked for. That
is a scheduled copy to a folder the school already backs up, not a return to a cloud account.
