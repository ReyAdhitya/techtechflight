# The board speaks in a professional register

Every user-facing string in `web/` moves to the register of aviation and risk management.
`CONTEXT.md`'s education-first rule is superseded, and `CONTEXT.md` is amended in the same
change rather than left contradicting the product.

The **language** does not change. Every string a Teacher sees is English, there is no
localisation and no second language anywhere in `web/`. Indonesian is how the team talks; it
never reaches the product. This decision is about register alone, and the distinction matters
because a register rewrite is exactly the task where a stray sentence in another language
would go unnoticed.

## Why this needed an ADR rather than a find-and-replace

The current copy is warm on purpose. It is a recorded decision in two places, and both had to
be reopened deliberately:

- `CONTEXT.md` — *"The vocabulary is education-first. Aviation words are kept only where they
  carry understanding a classroom word would lose."*
- `docs/DESIGN.md` §2 — a whole table mapping internal names to classroom words.

The strings the product owner objected to are that decision working as designed. *"Put it on
charge — it should come back before the lesson"* is an instruction rather than a measurement,
which `docs/DESIGN.md` §1.2 requires. It is warm because somebody decided it should be.

So this is not a defect being fixed. It is a decision being replaced, and without that written
down the next reader restores the warmth as a `CONTEXT.md` violation — correctly, on the
evidence in front of them.

## Why it cannot be done in pieces

A board half in aviation-formal and half in classroom-warm reads worse than either done
whole. The register is not a property of any one string; it is the thing a reader infers from
all of them at once, and a single chatty sentence in a screen of clipped ones reads as a
mistake rather than as warmth.

That is also why this item runs **last** in the board-corrections plan. It touches nearly
every string in `web/components/`, which is the same set of files W1, W2, W4 and W6 touch. Run
at any other position it collides with all of them, and the conflicts land in prose — the kind
a merge resolves plausibly and wrongly.

## What changes, and what is not register at all

The distinction that keeps this from becoming vandalism: **most of what makes this board
readable is not warmth, and does not move.**

| Changes | Stays, and why |
|---|---|
| Colloquialism — *"Keep an eye on it"*, *"hand out"*, *"getting large"* | **Instructions.** §1.2 requires every Alert to say what to *do*. That is usability, not warmth, and it survives intact. `Place on charge` is as much an instruction as `Put it on charge` |
| Reassurance addressed to the reader — *"Nothing has gone wrong"* | **Plain-language honesty.** A value that cannot be known is still said in words and never drawn as a zero (§11.1). `Z not reported` is professional *and* plain |
| Second-person chattiness — *"things need you"*, *"Nothing needs you"* | **`Now · Soon · Later`.** §2 chose time over danger deliberately. That reasoning is about ordering a queue, not about register, and it is untouched |
| Conversational contractions and dashes | **Teacher, Student, Lesson, Exercise.** The people and the classroom nouns are correct, and they are not aviation's to rename |

Worked examples, fixing the target before the sweep:

| Before | After |
|---|---|
| `3 things need you` | `3 items require action` |
| `Nothing needs you. Every Drone in contact is behaving.` | `No items require action. All Drones in contact are nominal.` |
| `5 of 6 ready to hand out` | `5 of 6 serviceable` |
| `Put it on charge — it should come back before the lesson.` | `Place on charge. Projected serviceable before the lesson.` |
| `Set this one aside. It will not be right in time.` | `Withdraw from service. Not projected serviceable before the lesson.` |
| `Nothing has gone wrong. Faults and flat batteries will appear here.` | `No incidents recorded. Faults and low-charge conditions are listed here.` |

## The hard boundary: five words that are not copy

```ts
export type Status = 'Offline' | 'Ready' | 'Not Ready' | 'Flying' | 'Fault'
```

These strings are **the type, the wire format and the display text at once**. They are
compared across `fleet-core/`, `ground-station/` and `web/`, they appear in `FleetEvent` and
in `NEEDS_ATTENTION`, and they are written into stored lesson records.

Renaming them is not a copy change. It is a contract change that breaks every stored record
and all four workspaces, and it would do so silently — a stored `'Ready'` read back by a build
that calls it something else does not error, it simply stops matching.

**Out of scope.** If the register work is later thought to require them, that is its own ADR
and its own migration. `Ready` and `Fault` are already correct airworthiness vocabulary, and
`Not Ready` and `Offline` are plain and unambiguous, so the case would have to be made rather
than assumed.

The same rule covers every other serialized key: `FleetEventKind`, and `ServiceState`'s
`'watch'` — whose label moved to *Under observation* while the key stayed exactly where it
was. **Labels change, keys do not.**

## Considered options

**Leave the copy warm.** Rejected by the product owner, whose product it is. Worth recording
that the warmth was defensible and defended: it is what `docs/DESIGN.md` §1.2's
instruction-first rule produces when a classroom is the setting.

**Convert only the strings that were pointed at.** Rejected — this is the half-converted board
above. It is also the version that looks cheapest and ages worst, because the next person
cannot tell which register is current and picks whichever is nearest.

**A tone toggle, formal or warm.** Rejected outright. Two registers means every new string
written twice, and a product that cannot decide how it speaks to a Teacher does not sound more
professional for offering the choice.

**Rename the `Status` strings to match.** Rejected, and separated above, because it is the one
part of this that is not copy at all.

## Consequences

`CONTEXT.md`'s education-first rule is gone, and `CONTEXT.md` says so. Every document that
defers to it inherits the change.

Many tests assert on visible text and fail. **They are the safety net proving the inventory
was complete** — every failure is a string the sweep found, and a string the sweep missed
shows up as a test that still passes while the screen around it changed. They are updated,
never weakened.

The board gets harder to read for a Teacher meeting it for the first time. *Serviceable* is a
word to be learned where *ready to hand out* was not. That cost was accepted knowingly, and it
is the thing to watch first if a Teacher struggles with the board later.

## When this ADR is wrong

If a Teacher cannot use the board. The register is a preference; the product failing at a
podium is not, and `CONTEXT.md`'s original reasoning — *a classroom educator, not a trained
drone operator* — is still the sharper description of who is standing there. If real Teachers
hesitate over *serviceable* or *nominal*, this decision is wrong and the evidence beats it.

It is also wrong if the audience turns out not to be a classroom teacher at all. A register
suited to a flight instructor is the right answer to a different question about who the board
is for, and that question deserves asking before this is defended on aesthetics.
