# The board has a light theme, and the two themes do not share status colours

ADR-0004 settled a monochrome board on a pure-black canvas with colour reserved for
exceptions. Everything in it holds. This adds a second theme and says why the colours
could not simply be carried across.

## Why a second theme at all

The board is read in a classroom. Classrooms have the lights on, and the board is often
projected. A pure-black canvas under a projector lamp in a lit room is the condition the
board is least readable in, and it was the only condition it supported.

The dark theme is unchanged and remains the one ADR-0004 designed. The light theme is a
second set of values for the same tokens, not a different system: the same monochrome
discipline, the same shapes, the same words, the same 4px radius and absent shadow tier.

Elevation inverts and stays honest to ADR-0004's rule that elevation is lightness alone —
on a light canvas `surface-1` sits *below* the canvas rather than above it.

The canvas is warm (`#faf9f7`) rather than white. The source system's own hairline runs
warm, and pure white glares under a projector.

## The status colours are re-derived, not reused

ADR-0004's amber and coral are chosen against black. Against a light canvas they fail:

| Token | Dark theme | on `#000000` | that value on `#faf9f7` | Light theme | on `#faf9f7` |
|---|---|---|---|---|---|
| Fault | `#f75a36` | 6.47:1 | 3.08:1 — fails | `#c3391a` | 5.09:1 |
| Not Ready | `#f5a524` | 10.29:1 | 1.94:1 — fails | `#8a5a00` | 5.63:1 |

Reusing them would have put the two Statuses that exist *specifically to be noticed*
below AA on the theme meant for a lit room — amber worst of all, at 1.94:1, which on a
projector is close to invisible.

The replacements hold hue rather than lightness: coral stays at 11° in both themes, and
amber moves only from 37° to 39°.
ADR-0004 chose that separation so the two stay tellable apart on a projector, and it is
the property worth preserving across a theme change — a Teacher must never have to
distinguish "charge it" from "take it out of service" by brightness.

## Colour is still not doing this alone

Nothing here weakens ADR-0004's rule that colour is the third signal. Every Status keeps
its word and its shape in both themes, and both themes are still monochrome when nothing
needs the Teacher.

## Consequences

Status colour can no longer be read out of a single constant; it resolves per theme
through `--status-*`. Any new status colour has to be specified twice and checked against
both canvases — the table above is the format to extend.

The board follows the machine's preference by default and can be overridden, because a
projector often disagrees with the laptop driving it.
