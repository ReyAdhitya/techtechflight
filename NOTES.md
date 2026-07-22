# Working notes

## About Reysendrya

- Mission was stated broadly ("I just want to build a good web app and UI"). Grounding it
  in TechTech Flight is what makes it teachable — keep every lesson tied to real code in
  this repo.
- Selected **all four** layers (information design, visual craft, real conditions, states
  and motion). Sequencing them, not cramming.
- Did **not** state a level. Working assumption: writes UI confidently, wants to derive
  design rules rather than copy patterns. Recalibrate after lesson 2.

## What the code already says about them

The board is not novice work. Before teaching anything, check whether it is already
handled — several obvious "improvements" are deliberate positions:

- Tiles never reorder on Status change (muscle memory) — `FleetBoard.tsx`
- Colour is never the sole carrier of meaning; shape and word carry it too — `StatusBadge`
- Needs Attention renders at zero so it changes rather than appears — `FleetSummary.tsx`
- Amber vs coral severity split is reasoned about at ~38° vs ~11° hue — `tokens.css`
- Elevation is lightness only; no shadow tier — ADR-0004
- `prefers-reduced-motion` already handled — `tokens.css`

Do not "fix" these. ADR-0004 and `CONTEXT.md` are the authority; argue with them
explicitly if arguing at all.

## Teaching approach that seems to fit

Audit-first. Teach a lens, then point it at their own file and let the code produce the
finding. The win lands harder because the bug is theirs and real.

## Open threads for future lessons

- **Type scale is entirely px** (`tokens.css:51-58`) — ignores the teacher's browser font
  size. Real conditions layer. WCAG 1.4.4.
- **No responsive step-down** — `--space-6` padding and 44px summary hold at 360px wide.
- **Motion is one transition** (`battery__fill`, 300ms). The "states and motion" layer is
  barely explored; state *transitions* are unaddressed.
- **Glanceability across a room** is claimed in comments but never measured. A real
  distance test would be a good skills lesson.
