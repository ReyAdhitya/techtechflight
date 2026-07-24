# Decisions

Judgement calls made while working, that are not big enough for an ADR but would otherwise
be invisible. Newest first. An entry here is a thing someone could reasonably have done
differently — not a record of every change.

For architecture, see [`docs/adr/`](./adr/). For the design system, see
[`../design.md`](../design.md) and [`DESIGN-TOKENS.md`](./DESIGN-TOKENS.md).

---

## 2026-07-24 The commit and branch convention moves to conventional commits

- **Decision:** New work uses `feat:` / `fix:` / `docs:` / `chore:` prefixes, on a branch,
  through a PR. Earlier history keeps its prose subjects.
- **Reason:** Asked for explicitly. `BROWNFIELD.md` prescribes it and the repo previously
  did the opposite — prose subjects committed straight to `main`, no merge commits.
- **Alternatives considered:** Keeping the repo's prose style, which is what its own
  "follow existing patterns" rule would normally imply, and which reads better. Overruled
  deliberately.
- **Consequence:** `git log` has a visible seam at this date. That is the cost.

## 2026-07-24 The page frame is two named frames, not one

- **Decision:** Instrument screens (Fleet, Control) use a wide frame; reading and form
  screens (Lesson, Reports, Students, Settings) use a narrow one. Both are named and
  enforced by a test.
- **Reason:** `docs/DESIGN.md` §3.4 says "one column, centred, with a maximum width" —
  singular. But the Fleet board is the one screen meant to be read across a room, and
  forcing it to the reading width costs it a column at 1440px, making tiles smaller on
  exactly the surface where size is the point. Two named frames still satisfies one
  column, centred, with a stated maximum.
- **Alternatives considered:** One literal frame (costs the board a column); one wide
  frame everywhere (stretches Settings and Students across an unreadable measure); leaving
  the five ad-hoc widths alone.
- **Note:** What was there before was not a considered third option. `FleetBoard`'s
  container predates `docs/DESIGN.md` by eight hours and had no maximum at all; the four
  other widths were each chosen locally afterwards. This replaces sediment, not a design.

## 2026-07-24 The simulation label spans the full sticky layer

- **Decision:** When fixing the flex axis, the label spans the full width of the sticky
  layer rather than matching the floating bar's 1240px maximum.
- **Reason:** `design.md` §9 rejects a badge for this label specifically — "the way a
  persistent indicator fails is that the eye stops seeing it". A full-width strip is a
  statement about the screen; a strip that tracked the bar's width would read as another
  piece of chrome.
- **Alternatives considered:** Matching the bar's width when floating, which reads as one
  object but adds a second animated maximum for no gain in legibility.
