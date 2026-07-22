# Mission: Building good web apps and UI

## Why

Reysendrya builds web apps and wants the interfaces to be genuinely good, not just
functional. TechTech Flight — the ground-station board a teacher checks before a lesson —
is the live subject: every lesson is grounded in improving that real board, so the skills
land on something being shipped rather than on exercises.

## Success looks like

- Can look at their own screen and name what is weak about it, with the reason, rather
  than sensing "something is off" without vocabulary
- Ships interfaces that hold up in the conditions they are actually used in — glanced at
  across a room, on a projector, by someone distracted, with data missing
- Covers the unglamorous states (empty, partial, stale, disconnected) as a matter of
  routine, not as bug reports after the fact
- Can defend an interface decision with a reason and a source, the way `docs/adr/`
  already defends the architecture ones

## Constraints

- Grounded in `D:\techtechflight` — lessons should critique and improve this real code,
  not toy examples
- The board already has strong, deliberate positions recorded in ADR-0004 and
  `CONTEXT.md`. Teaching must respect these and argue with them explicitly rather than
  flattening them into generic best practice
- Short sessions. One tangible win each

## Out of scope

- Design tooling (Figma, prototyping workflows) — the work happens in code
- Branding and marketing pages — this is an instrument panel, not a landing page
- Backend, protocol, and hardware concerns — `ground-station/` and `contract/` are
  settled by their own ADRs

## Open

Level was not stated. Lessons are pitched at "writes UI confidently, deriving design
rules rather than copying patterns" and will recalibrate on the first few results.
All four layers — information design, visual craft, real conditions, states and motion —
are in scope, sequenced rather than taught at once.
