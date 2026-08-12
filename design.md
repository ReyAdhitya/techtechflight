# Design system — Proposal Console (Tech Tech Technology)

Stack: Next.js App Router + Tailwind v4 (`@theme inline`) + shadcn/Base UI.
Single source of truth: `app/globals.css`. Component primitives: `components/ui/*`.

## 1. Identity

**Paper and marigold.** The neutrals are warm — they keep a little yellow in them
rather than the cold slate a stock theme ships with. That one decision is most of
what separates "considered" from "generic".

Logo: `public/logo-mark.png` (real alpha; **not** `logo.png`, which is amber baked
onto black and only faked transparency via `mix-blend-mode`).

## 2. Theming

Theme is stamped on `<html data-theme="light|dark">` by a boot script in
`app/layout.tsx` **before first paint** (explicit choice from `localStorage`, else
OS preference). Consequences:

- shadcn's default `.dark` selector never matches — the dark variant is redefined:
  `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`
- Components read the theme via `useSyncExternalStore` on that attribute, never by
  mirroring it into state in an effect (two toggles would drift).
- A `prefers-color-scheme` block covers the no-JS case only.

## 3. Colour tokens

### The two-step marigold — the rule that matters

| Token | Light | Dark | Job |
|---|---|---|---|
| `--brand` | `#e57a10` | `#f0902f` | **FILLS ONLY** — rails, dots, bars, rings. 2.95:1 on white; never carries text. |
| `--primary` | `#a55206` | `#f0902f` | The step that **does** carry text. |
| `--primary-foreground` | `#ffffff` | `#1a1410` | Dark flips which end is safe: on dark, text on brand must be near-black (7.6:1), not white (2.4:1). |

Same split Radix makes at its 9 vs 11. Collapsing them is exactly how accent
colours end up failing contrast.

Supporting brand steps: `--brand-strong`, `--brand-hover` (darker in light, *lighter*
in dark), `--brand-wash`.

### Surfaces (light / dark)

| Token | Light | Dark |
|---|---|---|
| `--background` | `#f4f3f0` warm paper | `#17130e` |
| `--foreground` | `#1b1815` warm near-black | `#f2ece2` |
| `--card` / `--popover` | `#ffffff` | `#201b15` |
| `--secondary` | `#faf9f6` | `#29231b` |
| `--muted` (ground) | `#f1eee8` | `#262019` |
| `--muted-foreground` (text) | `#726c62` — 4.7:1, lightest AA-safe step | `#a1978a` |
| `--accent` (hover ground, *not* the brand) | `#f6f1e8` | `#2b241c` |
| `--border` | `#e5e0d7` | `#362d23` |
| `--input` | `#ddd7cc` — a shade darker than border, so a field reads as a field | `#40362a` |
| `--ring` | `#e57a10` | `#f0902f` |

### Status

`--success` `#0f7d5b` / `#37bd86` · `--info` `#356a9c` / `#6aa7dc` ·
`--destructive` `#c0392b` / `#f07d6d`, each with a `-wash` ground.

### Chrome ("console") layer

The floating nav has its own elevated surface set so it can sit above any page:
`--console`, `--console-elev`, `--console-foreground`, `--console-muted`,
`--console-line` (a hairline: `rgba(...,0.13)` light / `rgba(255,255,255,0.09)` dark),
plus `--console-shadow`, `--console-shadow-hover`, `--console-mobile-shadow`.

## 4. Typography

Two faces, deliberately **not** Geist (which `shadcn init` adds as a third face bound
to `--font-sans`, colliding with the self-reference gotcha and giving two competing
body fonts).

- **Display** — Schibsted Grotesk (`--font-display`): refined low-contrast grotesk.
  `.font-display` also sets `letter-spacing: -0.02em; text-wrap: balance`.
- **Body** — Hanken Grotesk (`--font-sans`): warm humanist. Body sets
  `letter-spacing: 0.002em`, antialiased, `optimizeLegibility`.
- **Mono** — Geist Mono (`--font-mono`).

Helpers: `.eyebrow` (11px, 600, uppercase, `0.13em` tracking, muted) ·
`.tnum` (tabular figures — always use for numbers in tables/prices).

## 5. Shape, elevation, motion

- `--radius: 0.75rem`, exposed as `sm/md/lg/xl` (`calc(var(--radius) ± n)`).
- Shadows: `--shadow-sm`, `--shadow`, `--shadow-lg` — warm-tinted in light
  (`rgba(27,22,16,…)`), deep black in dark.
- Signature easing: `cubic-bezier(0.16, 1, 0.3, 1)` at ~0.62s for chrome state
  changes; `cubic-bezier(0.22, 1, 0.36, 1)` at 420ms for route slides.
- `prefers-reduced-motion` and `@media print` both hard-stop every
  animation/transition (`duration: 0.001ms !important`) rather than racing them —
  a half-transitioned colour is what put a dark ring in PDF exports.

## 6. Navigation

**One bar, shared by every page** (`app/components/chrome.tsx` → `SiteHeader`),
with two physical states:

- **Docked** (`scrollY <= 18`): full-bleed, square, no shadow, page palette.
  It reads as part of the page frame.
- **Floating** (`scrollY > 18`, `data-floating="true"`): contracts to
  `max-width: 1240px`, `16px` radius, hairline border, `blur(14px) saturate(140%)`,
  `--console-shadow`. Elevation appears only when it has a job to do.

Rules baked in:

- **Zero layout shift.** Every tab always renders icon + label; the active state is
  only a background chip. (The previous `ExpandableTabs` resized on click and shoved
  neighbours sideways.)
- Destinations are **places**, not actions: `New /` · `History /history` ·
  `Dashboard /dashboard` · `Quotation /quotation`.
- `New` calls `newRun()` — it clears the console rather than being a dead link.
- Layout: logo left, tabs absolutely centred at `lg+`, controls right. Below `lg`
  the tabs drop to their own row instead of being squeezed.
- **Phone (`<sm`)**: top rail keeps identity + runs tray + a `More` utility panel;
  navigation moves to a fixed **bottom tab bar** (iOS/Android pattern), respecting
  `env(safe-area-inset-*)`, with `body { padding-bottom }` to clear it.

## 7. Accessibility

- Skip link is the first tab stop on every page (`.skip-link` → `#content`).
- Global focus ring via zero-specificity `:where(...)`, so component styles still win:
  `2px solid var(--primary)`, `offset 2px`. Inside `.console-bar` it switches to
  `--brand` so it stays visible on both chrome themes.
- Touch targets ≥44px on phone (`.mobile-more-button` 44×44, `.mobile-tab` 52px min).
- `aria-current="page"` on active tabs; `aria-label="Main"` on both navs; the mobile
  panel wires `aria-expanded`/`aria-controls` and closes on Escape / outside pointer.
- Contrast is the reason for the two-step brand and for `--muted-foreground` being
  the lightest AA-safe step (4.7:1) rather than a prettier lighter grey.

## 8. Traps `shadcn init` will re-introduce if re-run

1. `--font-sans: var(--font-sans)` — a self-reference that breaks next/font.
2. Geist added as a third, competing body face.
3. `.dark` class selector instead of `[data-theme="dark"]`.
4. Cold slate neutrals overwriting the warm paper palette.

---

## 9. TechTech Flight — how this system applies to the Fleet board

Sections 1–8 describe the system as it was written for the Proposal Console. This
section records what the Fleet board adds, and where it cannot follow, so the two
products share a language without pretending to be the same product. See ADR-0009.

### Status is a layer this system does not define

The Proposal Console's `--success` / `--info` / `--destructive` describe how an
operation went. The Fleet board's Status describes what a physical aircraft *is* —
exactly one of Offline, Ready, Not Ready, Flying, Fault — and it is the most
important thing on the screen. That vocabulary is fixed in `CONTEXT.md` and its
colours were derived in ADR-0006 against measured contrast. They are kept:

| Status | Light | on `#f4f3f0` | Dark | on `#17130e` |
|---|---|---|---|---|
| Fault | `#c3391a` | 4.83:1 | `#f75a36` | 5.69:1 |
| Not Ready | `#8a5a00` | 5.34:1 | `#f5a524` | 9.06:1 |
| Ready / Flying | `--foreground` | — | `--foreground` | — |
| Offline | `--muted-foreground` | — | `--muted-foreground` | — |

Re-checked against the warm paper and warm near-black above rather than assumed:
every pair drops slightly from its ADR-0006 value and every pair still clears AA.

### Colour still means exception

The board is monochrome when the Fleet is healthy. Marigold is identity — it brands
the product, it is not sprayed across the instrument. Filling rails, dots and bars
with `--brand` here would put an amber within a few degrees of the Not Ready hue on
screen permanently, and a Teacher's eye would stop reading amber as news. The
`--brand` **FILLS ONLY** rule of §3 is therefore narrowed on this surface: fills are
for chrome and identity, never for a Drone.

For the same reason the logo is rendered in ink rather than in marigold.

### What the board does not take

- **Navigation (§6).** There is nowhere to go. The Fleet is one screen, so the bar
  carries identity and the room controls and nothing else. No tabs, no bottom bar.
- **Shadow, mostly (§5).** The tokens exist, but a Drone tile is still raised by
  lightness alone. Elevation is spent on the one floating element that needs it.

### What it adds

- **A fully relative type scale.** Every size on this surface is in `rem`, spacing
  included, so the Teacher's own browser font size moves all of it (ADR-0008). A `px`
  font-size here is a defect. There was also a Large format multiplier; it was removed by
  ADR-0034, because browser zoom already does that job at any size a room needs.
- **An anchored answer.** The Fleet summary stays below the room controls while the
  Drone grid scrolls. On a large Fleet, the number the Teacher opened the board to read
  no longer leaves the screen before the least important controls do.
- **Exception rails.** Not Ready and Fault spend Status colour on a broad leading rail
  rather than asking a one-pixel outline to carry hue. Fault is solid and Not Ready is
  interrupted, so shape still distinguishes them when colour does not. Ready, Flying
  and Offline add no ambient colour.
- **Change, not entrance.** A Drone whose Status changes while the board is open emits
  one transient ring in its new Status colour. Initial Fleet State never emits it, and
  reduced-motion removes it. Status word, shape, rail and colour otherwise change
  together rather than arriving at different speeds.
