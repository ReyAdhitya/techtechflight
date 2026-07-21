# We use the CrewAI DESIGN.md, adapted for a product surface, with colour reserved for exceptions

The visual system comes from `crewai.design.md` — pure black canvas, coral `#f75a36` as
border-and-CTA voltage only, no font weight above 500, and no shadow tier (elevation is
lightness contrast alone). Components are built on Radix Primitives, which are headless
and therefore impose no competing visual opinion.

That file documents a **marketing site**, not a product surface — it says so itself under
Known Gaps. Adapting it to a dense operational dashboard required deliberate deviations,
recorded here so nobody later "fixes" them:

- **4px radius on dashboard surfaces, not the 100px pill.** The pill exists to frame
  marketing screenshots; on a status tile it reads as a lozenge. The pill is kept for
  buttons only.
- **No display type above 44px.** A status board has no headline. The largest element is
  the fleet summary count.
- **Muted gray is used for body-tier text**, which the source system forbids. Here,
  fading *is* the meaning — it marks telemetry as Stale.
- **Plus Jakarta Sans and Inter** substitute for Gellix and Interdisplay, which are
  licensed. Both substitutes are named by the source document.

## Colour carries only exceptions

A healthy board is monochrome. Ready drones are white on black; Offline is muted gray.
Colour appears only when something needs the teacher: amber for Not Ready, coral for
Fault.

We rejected a conventional green/amber/red status palette. With every drone showing
green, colour on the board would carry no information and the eye would learn to ignore
it. Reserving colour for exceptions extends the source system's own border-only voltage
discipline, and turns the collision between "brand colour" and "warning colour" into the
organising idea: **when the brand orange appears, something needs you.**
