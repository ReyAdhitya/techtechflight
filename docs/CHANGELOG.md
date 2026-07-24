# Changelog

Newest first. One line per change that a Teacher, or the next person reading this code,
would notice.

## Unreleased

### Fixed

- **The simulation label is a strip under the bar again, not a white block beside it.**
  `.site-header-shell` was `display: flex` with no axis, so the bar and the label became
  columns of a row. On a phone the label swelled to a quarter of the viewport. The label's
  own rule was always written as a full-width strip; only the axis above it was wrong.
  This is requirement C5 — the one label that exists so a Teacher never presses **Land**
  wondering whether a real aircraft is coming down — so it mattered that it looked broken.
- **The timeline says how much time it covers without garbling it.** It used to build a
  duration by deleting "ago" from an age, which held until the answer was "just now" or
  "yesterday" — neither of which contains the word — and printed *"Covering the last just
  now"* on a freshly started ground station. `formatDuration` in `lib/age.ts` now says a
  span in its own words.
- **The product has one name again.** `d94b160` renamed Flight Deck to Readyboard and
  `44d770f` restored it, but only in the header — ten page titles were still saying
  "TechTech Readyboard". Every tab now reads "… · Flight Deck · TechTech".

### Added

- `docs/PLAYBOOK.md` — detected stack, how far behind current, conventions, pitfalls.
- `docs/DESIGN-TOKENS.md` — the design system as actually built, including the two-layer
  token structure that was not written down anywhere.
- First tests for `lib/age.ts` and `SiteHeader`.

### Changed

- **One page frame, in two named widths.** Five screens carried five different maxima —
  `6xl`, `5xl`, `4xl`, `3xl`, and `FleetBoard` with none at all — so the content edge moved
  every time a Teacher changed screen, and the Fleet screen rendered two frames at once.
  Instrument screens (Fleet, Control) now share one width and reading screens (Lesson,
  Reports, Students, Settings) another, both from `lib/frame.ts` and enforced by
  `web/page-frame.test.ts` so they cannot drift apart again. See `docs/DECISIONS.md`.
