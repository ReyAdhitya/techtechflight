# The board moves to Tech Tech Technology's paper-and-marigold system, and Status keeps its own colours

Supersedes ADR-0004. Amends ADR-0006 and ADR-0008 rather than replacing them.

The board was built on `crewai.design.md` — a captured marketing system, pure black canvas
and coral voltage, adapted for a product surface. It was a good system and none of its
reasoning was wrong. It was also a system belonging to another company, chosen because it
was available rather than because it was ours.

Tech Tech Technology now has one: warm paper neutrals and a two-step marigold, written for
the Proposal Console and recorded in `design.md`. Both products are ours and a Teacher who
sees both should see one company. So the Fleet board takes the shared palette, the shared
type (Schibsted Grotesk over Hanken Grotesk), the shared 12px radius, and the shared
`data-theme` mechanism.

## What the board does not take, and why

**Status colours.** The shared system's `--success` / `--info` / `--destructive` describe
how an operation went. Status describes what a physical aircraft *is*, and it is the most
important thing on this screen. ADR-0006's pair is kept, and re-checked against the new
canvases rather than carried across on trust:

| Status | Light | on `#faf9f7` | on `#f4f3f0` | Dark | on `#000000` | on `#17130e` |
|---|---|---|---|---|---|---|
| Fault | `#c3391a` | 5.09:1 | 4.83:1 | `#f75a36` | 6.47:1 | 5.69:1 |
| Not Ready | `#8a5a00` | 5.63:1 | 5.34:1 | `#f5a524` | 10.29:1 | 9.06:1 |

Every pair still clears AA and every pair has less headroom than it did. Anyone moving
these canvases again re-runs this table.

**Marigold as a fill.** `design.md` §3 makes `--brand` a fills-only token: rails, dots,
bars, rings. On this surface that rule is narrowed to chrome and identity, never a Drone.
Marigold sits within a few degrees of the Not Ready hue, and a board that filled its
furniture with it would put an ambient amber on screen permanently — which is precisely
how a Teacher's eye learns to stop reading amber as news. ADR-0004's central position
survives the change of palette intact: **colour means exception, and colour is never the
only signal.** For the same reason the logo renders in ink rather than in marigold.

**Navigation.** §6 describes a four-destination bar. The Fleet is one screen, so the bar
here carries identity and the room controls and nothing else.

**Shadow, mostly.** ADR-0004 had no shadow tier at all. The shared system has one, and we
now use it — on exactly one element. A Drone tile is still raised by lightness alone; the
floating header is the only thing that sits above the board and therefore the only thing
that needs to look like it does.

## What it gained

The theme moved from a next-themes class to `<html data-theme>`. That was §2's rule and it
had an unplanned consequence: the mechanism is now framework-free, so the Vite board can
run it too. ADR-0006's light theme had only ever existed in `web/`, because it was wired to
a Next.js library. Both boards now carry both themes and the same two controls. The parity
gap closed as a side effect of following the shared system rather than as a project.

## Consequences

`crewai.design.md` is deleted; `design.md` replaces it. ADR-0004 stays readable as history
and is marked superseded — its reasoning about colour-as-exception is still load-bearing
and is restated above, because that is the part that had to survive.

The type scale, spacing, large format and one-speed-of-change from ADR-0008 are unchanged.
They were expressed in `rem` and in tokens, so a palette swap did not touch them, which is
the argument for having done it that way.

`dashboard/` gets all of this despite ADR-0005 retiring it, because the two boards are
compared side by side while both exist and a comparison against a board on the old palette
would tell us nothing.
