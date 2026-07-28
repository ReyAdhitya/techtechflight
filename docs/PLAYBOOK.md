# Playbook — researched 2026-07-24

Step 0 of `BROWNFIELD.md`. What this repo actually runs, how far it is from current, and
what the wider ecosystem says today. Re-research before trusting this after ~3 months.

## Detected stack & versions

npm workspaces, no monorepo tool. Five packages (`contract`, `fleet-core`,
`fleet-adapters`, `ground-station`, `web`) plus a retired `dashboard/`.

| Area | Choice | Installed | Notes |
|---|---|---|---|
| Language | TypeScript | 5.9.3 | `strict`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` — a strict-plus baseline, not the default |
| Framework | Next.js App Router | 16.2.10 | `output: 'export'` — static files, no server (ADR-0005) |
| React | React | 19.2.7 | |
| Styling | Tailwind CSS v4 | 4.3.3 | CSS-first `@theme`, no `tailwind.config` file |
| Motion | `motion` | 12.42.2 | imported as `motion/react` everywhere |
| 3D | three + @react-three/fiber + drei | 0.185.1 / 9.6.1 / 10.7.7 | `/showcase` only |
| Primitives | Radix UI | dialog, hover-card, progress, slot, tooltip | no full shadcn install; `components/ui/*` is hand-written |
| Icons | lucide-react | 1.25.0 | two files only |
| Fonts | @fontsource, self-hosted | Schibsted Grotesk, Hanken Grotesk | bundled, never CDN (ADR-0002) |
| Tests | Vitest + Testing Library + jsdom | 3.2.7 | 25 files, 339 tests, one runner across all workspaces |
| Browser automation | playwright-core | 1.61.1 | `scripts/shot.mjs`, screenshots only |
| Lint | **none** | — | no ESLint, no Prettier, no `lint` script |
| CI | GitHub Actions | `.github/workflows/ci.yml` | `npm test` + `npm run typecheck` (+ web build) on push/PR |
| Deploy | Vercel, static | — | `vercel.json`, `NEXT_PUBLIC_DEMO_ONLY=1` build |

Baseline on 2026-07-24: `npm test` → **339 passed / 25 files**. `npm run build` → 15 static
routes, clean.

## Behind-current-by / advisories

| Package | Installed | Current | Verdict |
|---|---|---|---|
| next | 16.2.10 | **16.2.11** (Active LTS) | Patch behind. July 2026 security release, 4 high + 5 moderate |
| tailwindcss | 4.3.3 | 4.3.x | Current |
| react | 19.2.7 | 19.2.x | Current |
| motion | 12.42.2 | 12.x | Current |
| typescript | 5.9.3 | 5.9.x | Current |

**The Next.js advisory does not reach this app.** Every CVE in the July 2026 release is
server-side — Server Actions DoS, middleware/proxy bypass, SSRF in rewrites, response-body
cache confusion, Image Optimization SVG DoS, Server Function endpoint disclosure. This build
is `output: 'export'` with `images: { unoptimized: true }`: no server, no middleware, no
rewrites, no Server Actions, no image pipeline. The patch is still worth taking — it is free
and it keeps `next dev` current — but it is hygiene, not an incident.

**Dead dependencies found in `web/package.json`** (all four verified unimported):

- `framer-motion` — every import is `motion/react`. Two copies of the same library.
- `@fontsource/inter`, `@fontsource/plus-jakarta-sans` — `app/layout.tsx` loads only
  Schibsted Grotesk and Hanken Grotesk. Leftovers from before ADR-0009.

`three` + `@react-three/fiber` + `@react-three/drei` are used, but only by `/showcase`. They
are correctly code-split — the 872 KB chunk is lazy and no product route references it — so
this is dependency weight, not payload weight.

## Conventions this repo follows

**Prose over ceremony.** This is the strongest convention in the repo and it governs
everything else.

- **Commit subjects are sentences, in the imperative, with no type prefix.** "Serve the
  demonstration at the root, without a hop." "Stop republishing a record that has not
  changed." There is not one `feat:` in the history. **This contradicts the commit style
  suggested in `BROWNFIELD.md` §Git, and the repo wins** — BROWNFIELD's own rule is to
  follow the patterns already here.
- **Comments say why, never what.** Nearly every non-trivial function carries a block
  comment naming the decision, the alternative, and usually the ADR or requirement behind
  it. Matching this is not optional; a bare implementation reads as foreign here.
- **Tests are written as sentences.** `describe('one Drone, one Student')`,
  `it('refuses a name already flying something else, rather than reporting it later')`.
- **Domain words are enforced.** `CONTEXT.md` fixes the vocabulary and lists what to avoid.
  Teacher not user, Drone not device, Status not state, Alert ≠ Needs Attention.

**Layering.** `contract/` (shared types only) → `fleet-core/` (all Fleet logic, no Node
APIs, so it runs in a browser too — ADR-0013) → `ground-station/` (Node, WebSocket) and
`web/` (pure view). `web/import-boundaries.test.ts` enforces this in CI-less fashion — as a
test.

**Decisions live in `docs/adr/`**, numbered, prose, one decision each. Thirteen of them. The
architecture is not to be re-litigated casually; ADR-0004 and `CONTEXT.md` are named in
`docs/DELIBERATE-POSITIONS.md` as the authority.

**Design tokens** are a two-layer system in `web/app/globals.css`: shadcn-shaped base tokens
(`--background`, `--card`, `--border`, `--primary`) and a semantic alias layer on top
(`--color-surface-1: var(--card)`, `--color-hairline: var(--border)`, `--color-ink-*`). Both
are legitimate; the aliases are what components use.

**Branching.** `main` plus one long-lived `fleet-status-board`. No merge commits — history is
linear, committed straight to `main`. So `BROWNFIELD.md`'s branch-and-PR rule is a *change*
to this repo's habit rather than a continuation of it. Worth an explicit decision.

**No lint.** `npm test` and `npm run typecheck` are still the whole gate; CI runs both
on push and pull request so nobody has to remember.

## Current best practice (with sources)

- **WCAG 2.2 AA is still the target.** WCAG 3.0 reached a March 2026 Working Draft (~174
  requirements, graded Bronze/Silver/Gold, APCA-based contrast) but is not expected to be a
  Recommendation before ~2029, and ADA Title II / Section 508 / the EU Accessibility Act all
  still reference 2.1–2.2. Build to 2.2 AA; do not chase 3.0 yet.
  ([W3C WCAG 3.0 WD](https://www.w3.org/TR/wcag-3.0/), [AbilityNet](https://abilitynet.org.uk/resources/digital-accessibility/what-expect-wcag-30-web-content-accessibility-guidelines))
- **`framer-motion` is renamed, not deprecated.** Motion became independent in 2025; the
  package is `motion`, the import is `motion/react`, the API is unchanged. This repo already
  migrated — only the stale dependency entry remains.
  ([Motion upgrade guide](https://motion.dev/docs/react-upgrade-guide))
- **Next.js has moved to a pre-announced security release model** with an Active LTS
  (16.2.x) and a Maintenance LTS (15.5.x). Staying on the current patch of the LTS line is
  the supported posture.
  ([July 2026 security release](https://nextjs.org/blog/july-2026-security-release),
  [release program](https://nextjs.org/blog/next-security-release-program))
- **Tailwind v4's CSS-first `@theme` is the current idiom**; a JS `tailwind.config` is the
  legacy path. This repo is already on the current side.
  ([Tailwind changelog](https://github.com/tailwindlabs/tailwindcss/blob/main/CHANGELOG.md))

## Pitfalls to avoid

**Stack pitfalls**

- `output: 'export'` means no Server Components with data, no Server Actions, no route
  handlers, no `next/image` optimization. Any "improvement" that reaches for those breaks
  the deployment story in ADR-0002 and ADR-0005. The board must run off a laptop in a school
  with no internet.
- Re-running `shadcn init` would re-introduce the four traps listed in `design.md` §8:
  the `--font-sans: var(--font-sans)` self-reference, Geist as a third body face, `.dark`
  instead of `[data-theme="dark"]`, and cold slate neutrals over the warm paper palette.
- The theme and display-scale attributes are stamped on `<html>` by a boot script before
  hydration, so `<html>` and React disagree by design (`suppressHydrationWarning`). Read the
  theme with `useSyncExternalStore` on the attribute — never mirror it into state.

**Repo pitfalls**

- `docs/DELIBERATE-POSITIONS.md` lists six "obvious improvements" that are not: tiles never
  reorder, colour is never the sole carrier of meaning, Needs Attention renders at zero,
  the amber/coral hue split, elevation by lightness only, reduced-motion already handled.
  Argue with them explicitly via an ADR or leave them alone.
- Every ADR-backed decision that looks wrong probably has a reason written down. Check
  `docs/adr/` before "fixing" anything structural.

**Environment pitfalls (Windows)**

- `next build` fails with `EBUSY: rmdir 'web/out'` if any shell has that directory as its
  working directory. Don't `cd` into `web/out`.
- Git Bash rewrites bare `/route` arguments into Windows paths. Pass routes to
  `scripts/shot.mjs` from PowerShell, or without the leading slash.
- `scripts/shot.mjs` resolves Chromium out of `~/AppData/Local/ms-playwright` by hand
  because only `playwright-core` is installed — there is no bundled browser download.
