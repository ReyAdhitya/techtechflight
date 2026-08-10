# The review of the twenty one, and what it found

Front end review of PR #655, received 2026-08-10. Both HIGH findings verified against the
code before being written down here.

**Read this first: the review is incomplete and says so.** The Standards axis stalled with no
output, so **px font-sizes, raw colours, the PIN's storage model and the 200-Drone limit were
never checked by anyone.** What follows is a spec pass plus the reviewer's own runtime pass.
That gap is a finding in itself and is listed as work below.

The reviewer worked at 390 first and then upward, which is what the prompt asked for, and it
is why both HIGH findings exist. Neither is visible on a laptop.

## HIGH 1. The demo's one Recall flies to the wrong place

**Verified.** `takeOff` in `simulated-telemetry-source.ts` does this unconditionally:

```
drone.homeEastM = drone.eastM
drone.homeNorthM = drone.northM
...
drone.targetAltitudeM = round(1.5 + this.#random() * 2, 2)
```

and `flyRoute` calls `this.takeOff(droneId)` with **no airborne guard**. So calling `flyRoute`
on an aircraft already in the air re-stamps its home to wherever it happens to be, and jumps
its hover height at the same time.

`DemoMissionDirector` does exactly that, on an aircraft it has already filtered as airborne.

The reviewer ran it:

| | Result |
|---|---|
| Control: take off, fly out, Recall | returns to the bench, 0.0 m away. Correct |
| Demo incident, then Recall | lands **8.5 m from the launch point** |

**Meanwhile the Scope keeps drawing the honest line.** The home marker and dotted line come
from `HomePointTracker`, which uses the last grounded frame, so it still points at the bench.
At the one scripted moment the demo exists to prove Recall trustworthy, **the line on screen
and the aircraft's actual destination disagree, and nothing says so.**

The bug sits directly beneath a comment reading *"Recall promises the launch point; this is
what makes that promise true, and it is per Drone because six craft Recalled to one square
metre collide."*

**Fix:** gate the home stamp on `!drone.airborne` inside `takeOff`, or have `flyRoute` skip the
take-off when the aircraft is already up. The altitude re-randomisation needs the same guard.

## HIGH 2. The Student screen scrolls sideways on a phone

At 390 and 360, `documentElement.scrollWidth` is **1246 against a 390 viewport**, and
`window.scrollTo(600, 0)` genuinely moves the page. A child can swipe the whole Student screen
856 pixels into blank space.

**The cause was pinned, not guessed.** `.sr-only` computes to `position: absolute`, and the
rail's scrolling `<ol>` is `position: static`, so the screen-reader text positions against a
further ancestor and escapes the `overflow-x: auto` clip. Proven both directions in the live
page: hiding the sr-only spans drops `scrollWidth` to 390, and setting `position: relative` on
the `<ol>` also drops it to 390. Their first hypothesis was wrong and they discarded it.

**Fix: add `relative` to that `<ol>`. One word.**

**Worth naming, because it will happen again:** the accessibility text required by ADR-0004 is
what breaks the phone layout. Both rules are right; the interaction between them is the bug.
This is also the exact defect class the whole wave existed to remove, appearing in the wave's
newest component, and jsdom cannot see it.

## MEDIUM 3. The type-scale test does not catch what it claims

`web/type-scale.test.ts` accepts only `full.endsWith('.tsx')`, so every `text-*` class in a
`.ts` file is unchecked. Arbitrary values also pass: `showcase/DroneCard.tsx` has
`text-[1.375rem]` and `ConnectionStrip.tsx` has `text-[0.9375rem]`.

These are **the same two gaps reported last wave, unchanged.** The test is not wrong; its
claim is.

## LOW. The two status cards are too narrow at 390

"The Teacher's board" wraps to one word per line. The reviewer calls it taste rather than a
defect, and I agree.

## Verified working, and run rather than read

Nothing in the air that nobody cleared, at four widths and both themes, on a cold board and a
cold Mission run. A child cannot reach the Teacher board: `switchRole: false` on the Student
side everywhere, and the Teacher side now gates on a four digit PIN behind a real form. Two
pressable things and no third. Nothing in the header wraps at any width. Back to the Mission
from Walls works both ways. Three rules, and the later warning reuses those words. The door is
two identical boxes, one word each, no subtitle, no overflow. Absent readings are still words.

**Read but not run:** no Student no takeoff, phases from records, zones on Side and Front, and
the drawing half of the home point. Approve-cannot-appear-early was proved by harness in the
previous wave and not re-run.

## The three departures from the brief, and the ruling

The reviewer flagged three places where the work went **past** the brief rather than around it.
None is harmful. All three are kept:

| What | Ruling |
|---|---|
| `ClassroomFleetSizePanel` adds a Settings number for Fleet size. The plan said delete the cap, not add a control | **Keep.** Unlimited is meaningless without a way to add. Deleting the cap and leaving no control would have been the literal reading and the useless one |
| `no-fly-alert.ts` is a general breach-Alert fix, where the plan asked only that the Alert fire in the demo | **Keep, gratefully.** A no-fly breach raising no Alert was never a demo problem. Fixing it only for the demo would have left the real defect in place |
| `RoleGate` now sends Teachers to `/mission` rather than `/lesson` | **Keep.** `/mission` is the spine since ADR-0026; `/lesson` is a forward |

## The prompt

```
Four fixes from the review of PR #655, and one gap in the review itself. Every
decision is made; do not stop to ask.

1. HIGH. THE DEMO'S RECALL FLIES TO THE WRONG PLACE.
   takeOff in fleet-core/src/simulator/simulated-telemetry-source.ts stamps
   drone.homeEastM / homeNorthM from the current position unconditionally, and
   re-randomises targetAltitudeM. flyRoute calls takeOff with no airborne
   guard, and DemoMissionDirector calls flyRoute on an aircraft it has already
   filtered as airborne.
   Result, measured: after the demo incident a Recall lands 8.5 m from the
   launch point, while the Scope's dotted line still points at the bench,
   because HomePointTracker uses the last grounded frame. The line and the
   aircraft disagree and nothing says so.
   Gate the home stamp on !drone.airborne, and gate the altitude
   re-randomisation the same way, or have flyRoute skip the take-off when the
   aircraft is already up. Pin it with a test that flies a route on an airborne
   Drone and asserts home did not move.
   This is the ninety seconds the demo exists for. Fix it first.

2. HIGH. THE STUDENT SCREEN SCROLLS SIDEWAYS ON A PHONE.
   At 390 and 360, documentElement.scrollWidth is 1246 against a 390 viewport.
   .sr-only computes to position: absolute and the rail's scrolling <ol> is
   position: static, so the screen-reader text positions against a further
   ancestor and escapes the overflow-x clip. Add `relative` to that <ol>.
   Proven both ways in the live page: hiding the sr-only spans, or setting
   position: relative, each drop scrollWidth to 390.
   Then sweep for the same pattern: any scroll container holding sr-only text
   and lacking a positioning context has this bug. jsdom cannot see it, so add
   a stylesheet assertion rather than a render test.

3. MEDIUM. THE TYPE-SCALE TEST DOES NOT CATCH WHAT IT CLAIMS.
   web/type-scale.test.ts:27 accepts only full.endsWith('.tsx'), so every
   text-* in a .ts file is unchecked, and arbitrary values pass:
   showcase/DroneCard.tsx text-[1.375rem], ConnectionStrip.tsx
   text-[0.9375rem]. These are the same two gaps reported in the previous wave
   and still unchanged. Widen the test to .ts as well, refuse arbitrary values,
   and fix the two files it then catches.

4. LOW, taste. The two status cards on the Student screen wrap to one word per
   line at 390. Give them room or let them stack.

5. THE REVIEW HAS A HOLE, AND IT IS NOT THE REVIEWER'S FAULT.
   The Standards axis stalled with no output, so px font-sizes, raw colour
   literals, the PIN's storage model and the 200-Drone limit were never
   checked by anyone. Run those four checks yourself and report what you find,
   rather than letting a missing pass read as a clean one.

KEEP ALL THREE OF THE DEPARTURES the reviewer flagged: the Fleet size control,
the general no-fly Alert fix, and RoleGate sending Teachers to /mission. All
three are rulings from the owner, recorded in this plan.

Gate is npm test and npm run typecheck. Shoot the Student screens at 390 and
360 in both themes and confirm scrollWidth equals the viewport before claiming
item 2.
```

## The lesson worth keeping

Three rounds now, and the pattern has not changed: **everything serious was found by running
the product, never by reading it or testing it.** HIGH 1 was found by flying the demo. HIGH 2
was found by swiping a phone. A suite of 1,620 tests was green through both.
