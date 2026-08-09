# Design tokens — extracted 2026-07-24

`BROWNFIELD.md` Step 3, in **extraction mode**: a record of the design system already in
`web/app/globals.css`, not a proposal. The design system exists; this writes down what it
is so the next change matches it instead of averaging it.

**Authorities, in order.** `design.md` (the system) → `docs/DESIGN.md` (the product spec) →
`CONTEXT.md` (the words) → `docs/adr/` (why). Where this file disagrees with any of them,
they win and this file is stale.

## The shape of the system: two layers, on purpose

This is the part that isn't documented anywhere else and the part most likely to be got
wrong. `globals.css` defines colour **twice**, and both layers are load-bearing.

```
:root / [data-theme="dark"]     raw hex, per theme      --background: #f4f3f0
        ↓
@theme  base layer              shadcn-shaped names     --color-background: var(--background)
@theme  semantic layer          this board's words      --color-canvas: var(--background)
        ↓
markup                          Tailwind utilities      class="bg-canvas text-ink-subtle"
```

**Markup uses the semantic layer.** `bg-canvas`, `bg-surface-1`, `border-hairline`,
`text-ink`, `text-ink-muted`, `text-ink-subtle` — the vocabulary ADR-0004 taught the board.
The shadcn-shaped names underneath exist so the palette can stay shared with the Proposal
Console (ADR-0009). Writing `bg-background` or `text-muted-foreground` in a component is
not wrong, but it is foreign — it breaks the board's own vocabulary for no gain.

There is no `tailwind.config.js`. Tailwind v4, CSS-first, everything in `@theme`.

## Colour

### Surfaces and ink

| Semantic | Base | Light | Dark | Contrast on its ground |
|---|---|---|---|---|
| `canvas` | `--background` | `#f4f3f0` | `#17130e` | — |
| `surface-1` | `--card` | `#ffffff` | `#201b15` | — |
| `hairline` | `--border` | `#e5e0d7` | `#362d23` | — |
| `ink` | `--foreground` | `#1b1815` | `#f2ece2` | 15.93 / 15.73 |
| `ink-subtle` | `--ink-subtle` | `#4a463f` | `#cdc3b5` | 8.45 / 10.62 |
| `ink-muted` | `--muted-foreground` | `#726c62` | `#a1978a` | 4.69 / 6.43 |

Measured 2026-07-24 against `canvas`. **Every pair clears WCAG AA**, and `ink-muted` is the
lightest step that does — 4.69:1 is not a coincidence, it is the floor. Do not add a
lighter grey.

`ink-subtle` exists only on this board (the shared system has no such step). It carries the
age line under every value — the thing that says whether the number above it is still true —
and the comment in `globals.css:146` is explicit that dropping that line to `ink-muted`
would make a Teacher squint at it.

### Status — this board's own layer

The shared system's `success` / `info` / `destructive` describe **how an operation went**.
Status describes **what a physical aircraft is**, and the two must not be confused.

| Status | Light | Dark | Notes |
|---|---|---|---|
| Fault | `#c3391a` (4.83:1) | `#f75a36` (5.69:1) | ~11° hue |
| Not Ready | `#8a5a00` (5.34:1) | `#f5a524` (9.06:1) | ~38° hue |
| Ready / Flying | `--foreground` | `--foreground` | no colour of its own |
| Offline | `--muted-foreground` | `--muted-foreground` | recedes; not an error |

The amber/coral separation is deliberate and reasoned
(`docs/DELIBERATE-POSITIONS.md`): two severities that must
stay distinguishable to a colour-blind eye and on a washed-out projector, which is why
**shape carries them too** — Fault's rail is solid, Not Ready's is interrupted.

### Marigold — the two-step rule, narrowed here

`--brand` `#e57a10` **fills only**, never carries text (2.95:1). `--primary` `#a55206` is the
step that carries text. Collapsing them is how accent colours fail contrast. In dark,
`--primary-foreground` flips to near-black because white on marigold is 2.4:1.

**On this surface the rule is narrower than in `design.md` §3**: fills are for chrome and
identity, **never for a Drone**. Marigold sits within a few degrees of the Not Ready hue, and
spraying it across the instrument would train a Teacher's eye to stop reading amber as news.
The board is monochrome when the Fleet is healthy. The logo renders in ink, not marigold.

## Type

Two faces, both self-hosted via `@fontsource` — never a CDN, because the board has to work
in a school with no usable internet (ADR-0002).

- **Display** — Schibsted Grotesk (`--font-display`), 400/500/600. `.font-display` sets
  `-0.02em` tracking and wins on source order, so per-component tracking is dead weight.
- **Body** — Hanken Grotesk (`--font-sans`), 400/500/600.
- **Mono** — Geist Mono (`--font-mono`), declared but the webfont is not loaded.

`@fontsource/inter` and `@fontsource/plus-jakarta-sans` are installed and **never imported**.

### Scale — every value in `rem`, no exceptions

| Token | Size | Job |
|---|---|---|
| `--text-summary` | 2.75rem | the Fleet count; the largest thing on the board |
| `--text-dialog-title` | 2rem | |
| `--text-heading` | 1.5rem | |
| `--text-tile-name` | 1.5rem | a Drone Name, read from a few steps away |
| `--text-body` | 1rem | |
| `--text-value` | 1rem | **data — deliberately no smaller than body** |
| `--text-caption` | 1rem | supporting prose and compact controls; **also no smaller than body** |
| `--text-label` | 0.75rem | names a thing, never informs; always uppercase + tracking |

`--text-caption` had twenty callers and no rule behind it until 2026-08-09, so every one of
them silently inherited body. It is body, for the same reason `--text-value` is: this surface
refuses small print, and a caption a Teacher squints at mid-lesson is worse than one that
takes an extra line.

`rem` throughout so the scale follows the Teacher's own browser font size rather than
overriding it (WCAG 1.4.4, ADR-0008). **A `px` font-size on this surface is a defect.**

`--display-scale` is a root multiplier for the large format, so one control moves every
size. Set by a boot script on `<html data-display="large">` before first paint.

Helpers: `.tnum` for tabular figures — mandatory on any number that changes in place, or
the row jitters.

## Shape, elevation, motion

- `--radius: 0.75rem`, exposed `sm/md/lg/xl`; `--radius-surface` for board surfaces (was 4px
  under ADR-0004, replaced by the shared 12px), `--radius-pill: 100px`.
- **Elevation is lightness, not shadow.** The `--shadow-*` tokens exist and are spent on the
  one floating element that needs them — the docked/floating header. A Drone tile is raised
  by being `surface-1` on `canvas` and nothing else.
- Motion:
  - `--chrome-duration: 620ms` / `cubic-bezier(0.16, 1, 0.3, 1)` — chrome state changes
  - `--status-change-duration: 1100ms`, same easing — the transient ring on a Status change
  - Status change emits **once, on change while the board is open**. Initial Fleet State
    never emits it, so a freshly loaded board sits still.
  - `prefers-reduced-motion` and `@media print` both hard-stop everything at
    `0.001ms !important` rather than racing it.

## Theming

`<html data-theme="light|dark">` stamped by a boot script **before first paint** (explicit
`localStorage` choice, else OS preference). Consequences that bite:

- shadcn's `.dark` selector never matches. The variant is redefined:
  `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`
- Read the theme with `useSyncExternalStore` on the attribute. Never mirror it into state in
  an effect — two toggles would drift.
- `<html>` and React disagree by design; the root element carries `suppressHydrationWarning`.
- A `prefers-color-scheme` block covers the no-JS case only.

## Rules that are not negotiable without an ADR

1. **Colour is never the sole carrier of meaning.** Every Status has a word and a shape.
2. **Tiles never reorder** on a Status change. Muscle memory is the point.
3. **Counts render at zero** rather than vanishing, so their return is a number changing and
   not an element materialising.
4. **Every displayed value carries its age.** A Drone that has never responded says so —
   it must not look like one showing an empty battery.
5. **A value that cannot be known is said in words, never drawn as a zero.**
6. **`rem` only.** See ADR-0008.
7. **No second component library, no new font, no new colour** to solve one screen.

## Known inconsistencies in the system as built

Recorded here rather than silently averaged. These are defects against the system above,
not alternative readings of it.

- **Page frame.** Seven components, five different maxima — `max-w-6xl` (Fleet, Control),
  `max-w-5xl` (Lesson, Reports), `max-w-4xl` (Students), `max-w-3xl` (Settings), and
  `FleetBoard` with **no maximum at all**, so the Fleet screen renders two frames at once.
  `docs/DESIGN.md` §3.4 specifies one column with one maximum.
- **Flight strip has no fixed anatomy.** `docs/DESIGN.md` §1.1 justifies the strip format on
  "scannable by position rather than by reading", but the row is `flex flex-wrap`, so a
  variable-width phase word shifts every column right of it. It only looks aligned because
  every Drone is currently in the same phase.
- **Product carries two names.** Ten page titles say "TechTech Readyboard"; the root layout
  and the header say "Flight Deck". `CONTEXT.md` defines neither.
