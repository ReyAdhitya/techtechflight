# The Student tablet gets a rail, and it cannot be tapped

The Student's tablet carries a rail down its left edge showing all twelve steps of the lesson,
marking the one they are on. It is **look only**. Nothing in it is a link, a button, or focusable.

This amends rule 6 of
[ADR-0025](./0025-the-student-screen-is-a-second-audience-not-a-second-board.md), which reads
*"Nothing on screen talks about the software. No phase counter, no permanent classroom code."*
The classroom code half stands. The phase counter half is reversed.

## Why the original rule was right, and why it still lost

Rule 6 was aimed at a real failure: a screen that narrates its own state machine at a child.
"Phase 4 of 12" is a number about the software, and a ten year old at a flight line has no use
for it.

What the owner asked for is not that. It is the list of what the lesson *does*: Briefing, Rules
and time, Prepare, Connect, Ask to take off, Take off, Fly the points, Stay out of red, Teacher
says, Task done, Land, Score. Those are twelve things that happen in a classroom, in the order
they happen, and a child who has looked up from their controller can find their place in them.
That is a lesson plan, not a phase counter, and it was worth reversing the rule for.

## Why it cannot be tapped

**A Student never chooses what happens next.** Every arrow in the Student state machine is
pulled by the Teacher answering or the Drone moving. A rail that responds to a press would be
offering a choice that does not exist, and a child who pressed *Land* on it and watched nothing
happen has learned that the screen lies.

So the rail is a paragraph, not a navigation: an `<ol>` of text with no interactive element in
it. This is also what keeps ADR-0025's rule 5 intact. **Exactly two pressable things in the
whole app** stays true only because the twelve rows are not pressable. A tappable rail would
have made it fourteen, and twelve of those fourteen would do nothing.

## What is unchanged in ADR-0025

Everything else. Landscape and full width. One dominant thing at a time, changing with the
phase. A warning is full width or absent. **Ask to take off** and **Understood**, and no third.
No permanent classroom code. No invented readings: an absent value is printed in words, never
as a zero and never as a dash. Nothing on the tablet reaches an aircraft (ADR-0021).

## What could have gone differently

**Show only the current step, as a line of text.** Cheaper, and it answers "where am I". It
does not answer "what is coming", which is the thing a child asks a teacher out loud in the
middle of a lesson, and the rail answers it without anybody having to ask.

**Make the rail tappable and let it preview a step.** Rejected twice over: it breaks the
two-press rule, and a preview of a step you cannot enter is a worse version of the locked step
the Teacher's rail already has, on a device with no Teacher to explain it.
