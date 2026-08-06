# The Student screen is a second audience, not a second board

TechTech Flight has two audiences and it now has two screens. The Teacher's board answers "can
I hand this out, and what is my class doing". The Student's tablet answers "what am I doing,
may I go, and how did I do". They read the same Fleet and the same Mission, and almost nothing
else about them is the same.

This records what makes the second one different, and the three things it does not do, so the
next person does not build them by accident.

## The first attempt, and why it was reverted

PR #631 shipped a Student screen and the owner reverted it from the GitHub web UI eight minutes
later. The screen was a small copy of the board: a phone-width column in the middle of a tablet,
six equal chips in a grid so nothing led, the objective crammed into a chip beside a number, and
a placeholder string printed where a battery reading belongs.

Every one of those follows from treating the tablet as a narrow board. A board is read by one
adult sitting down, who can scan a grid and pick out the tile that matters. The tablet is read
by a ten year old standing at a flight line with a controller in their hands, for about two
seconds at a time, from roughly two metres, while looking mostly at an aircraft.

So the rules the screen is built to are audience rules, not layout preferences:

1. Landscape, full width. The device is a tablet on a desk, not a phone in a hand.
2. **One** dominant thing, and it changes with the phase: the objective before takeoff, the
   answer while waiting for clearance, the battery or the near checkpoint in the air, the
   score once the Mission is sealed.
3. Everything else stays quiet until it matters.
4. A warning is full width or it is absent. Nothing is dimmed into a permanent stripe the eye
   learns to skip.
5. Exactly two pressable things in the whole app: **Ask to take off** and **Understood**.
6. Nothing on screen talks about the software. No phase counter, no permanent classroom code.
7. No invented readings.

Rule 6 is the one that keeps being tempting. A four-character classroom code is a real thing in
the data, and putting it in a corner costs nothing except that a child now has a string to keep.
They know their own name; the roll is what they pick from.

## The three limits, said out loud

Each of these is a real boundary of the shipped thing, not a to-do. Two of them are permanent.

**One machine.** The classroom session lives in `localStorage` with `BroadcastChannel` keeping
two tabs on one laptop honest. A second tab on the Teacher's machine is a Student's tablet
today; an iPad on the school Wi-Fi is not, because nothing yet carries the session across a
network. The transport is specified and not built, and until it is, "the Student app" means a
second window. This limit is temporary, and it is the only one of the three that is.

**Nothing here reaches an aircraft.** Asking for takeoff is a record and so is acknowledging an
instruction ([ADR-0021](./0021-clearances-and-instructions-are-records-not-commands.md)). The
Students fly by hand, on real hardware, and no clearance in this product has ever started a
motor. This is why there are two pressable things rather than a set of controls: there is
nothing else on this screen that could honestly be pressed.

**A reading the Fleet is not sending is not shown.** "Not reporting" for a craft the board has
never heard of, "Not measured" for a criterion nothing watched, "Not scored" for a Mission with
too little measured to judge. A frozen tablet and a working tablet look identical, which is why
the brief prints the age of the last reading rather than a tick, and why the flying screen
prints the remaining time rather than the limit. The first version printed the limit, which is a
fixed number wearing a countdown's name.

## The phase is a record, never a press

Which screen a Student is on is decided by Telemetry and by what the Teacher answered, and by
nothing they can press. That took two corrections worth keeping:

**Held is its own phase.** It used to send the seat back to `request-takeoff`, so a Student the
Teacher had told to wait was indistinguishable from one who had never asked, and the screen
could not say why they were waiting. Asking again is what clears a hold; the Teacher is not
asked to un-hold.

**A clearance is not a flight.** Landing was read from `clearedAt`, which is permission to leave
the ground rather than evidence of having left it, so a Student cleared and still standing on
the pad was told they had landed. The seat carries `flownAt`, written once from the first
Telemetry sighting off the ground and never cleared.

Held is worded as an instruction and never as a refusal. A child who reads "denied" has been
told they did something wrong. A child who reads "wait, your Teacher is coming" has been told
what happens next, which is both the true thing and the useful one.

## The score is read back, never recomputed

The Teacher seals the Mission on Control, and the sealed outcome is copied onto the classroom
session by the same route the brief travels. The tablet renders that number and does not work
one out. Two arithmetics for one grade is one of them being wrong, and a child's tablet is the
worst possible place to discover it.

Which criteria appear is the Scenario's answer ([ADR-0018](./0018-a-mission-is-a-first-class-record.md)):
Search and Rescue does not judge procedures, Delivery does not judge collisions. Showing all
five would put a mark against work the brief never asked for.

## What could have gone differently

**Let the Student's tablet read the Logbook directly.** It is on the same machine today, so it
would work. Rejected: the Logbook is the Teacher's record, and the classroom session is the
document written to be read by a tablet. Pointing the Student screen at the Logbook would have
to be undone the moment the session crosses a network, and it puts every Lesson a School has
ever run within reach of a child's device.

**A single Student screen that grows sections as the Mission proceeds.** Rejected: it is how
the reverted one worked. Landing, waiting for clearance and flying are different questions, and
a screen that answers all of them at once answers none of them at two metres.

**Compute the score on the tablet from the same evidence.** Rejected above, and worth naming
because it looks like the more responsive option. It is: it is also the version where a Student
and their Teacher can disagree about a grade.
