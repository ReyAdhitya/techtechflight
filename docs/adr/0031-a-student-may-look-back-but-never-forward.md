# A Student may look back, but never forward

A Student may tap a step of their rail that has **already happened** and re-read it. A step
that has not happened stays untappable, exactly as before.

This amends one line of [ADR-0028](./0028-the-student-rail-is-look-only.md): *"It is look
only. Nothing in it is a link, a button, or focusable."* Everything else in that ADR stands —
the rail is still the lesson rather than a phase counter, it still shows all twelve, and a
Student still never chooses what happens next.

## Why the original refusal was right about the wrong half

ADR-0028's argument is one sentence and it is a good one:

> **A Student never chooses what happens next.** Every arrow in the Student state machine is
> pulled by the Teacher answering or the Drone moving. A rail that responds to a press would
> be offering a choice that does not exist, and a child who pressed *Land* on it and watched
> nothing happen has learned that the screen lies.

That is about the **future**. It is completely correct about the future and says nothing about
the past. Tapping *Land* when you are at step 5 is asking for something that is not yours to
ask for. Tapping *Rules and time* when you are at step 7 is not asking for anything at all:
it already happened, and you were there.

**Looking back at what already happened is memory, not navigation.** The state machine does
not move. Nothing is requested. The rail is still not offering a choice.

## What the refusal cost

A child who cannot re-read the rules asks the Teacher instead — out loud, mid-lesson, while
holding a drone. That is the exact interruption the rail was built to remove, arriving through
the one hole left in it. There are three rules and they are on step 2; the child is at step 7
with a controller in their hands and cannot see them.

## What must be true for this to stay safe

Two things, and both are load-bearing:

**A way back to now.** A child who taps step 2 and then nothing happens must be able to return
without waiting for the lesson to move. Otherwise looking back is a trap, which is the thing
the exit-when-airborne defect already taught us about this app.

**The screen pulls itself back the moment something needs them.** A child re-reading step 2
must not miss their takeoff clearance. The Teacher's answer outranks whatever the child chose
to look at, and it arrives without being asked for, because the whole product rests on phases
coming from records and Telemetry rather than from a press. A screen a child could leave
stale by reading is a screen that can hide a Teacher's instruction, and that would be worse
than the interruption this change removes.

## The two-press rule is untouched

ADR-0025 allows exactly two pressable things, and both are **Mission presses**: *Ask to take
off* and *Understood*. The rail's back-taps are not among them, on the same reasoning already
written for joining, for picking a Drone, and for leaving a classroom: those all happen either
side of the Mission rather than inside it, and none of them reaches an aircraft or asks the
Teacher for anything. Re-reading is the weakest of the four — it does not even write a record.

A row that has not happened is still not focusable, so the count of things a child can press
and have nothing happen is still zero.

## Considered options

**Leave it look-only and print the three rules on every screen.** The cheapest answer, and it
was the standing one. Rejected: the rules are one of twelve things a child might want to
re-read, and putting all twelve on every screen is the wall of text this product spent a whole
wave removing.

**Let a Student tap any step, and show the later ones as locked.** Rejected in ADR-0028 and
still rejected. A preview of a step you cannot enter is a worse version of the Teacher's
locked row, on a device with no Teacher standing next to it to explain the lock.

**A single Back button rather than a tappable rail.** Rejected as the same feature wearing
fewer clothes: it reaches the same screens with more presses, and it cannot say *which* step
you would land on, which is the thing the rail is for.

## When this ADR is wrong

If a child is observed reading the rail *instead of* flying — using it as somewhere to be
rather than something to check — the back-tap is a distraction and should go. That is a thing
to watch in a real lesson, which has still never happened.
