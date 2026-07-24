/**
 * The page frame. One column, centred, with a stated maximum — in two widths.
 *
 * `docs/DESIGN.md` §3.4 asks for one column with a maximum width, and says it in the
 * singular. What was here instead was five different maxima and one screen with none at
 * all, so the content edge moved every time a Teacher changed screen.
 *
 * That was sediment rather than a design: `FleetBoard`'s container predates §3.4 by eight
 * hours and never had a maximum, and the four widths after it were each chosen locally.
 *
 * Two frames rather than one, because the two kinds of screen genuinely differ:
 *
 * - **Instrument** screens are looked at. The Fleet board is read across a classroom or
 *   off a projector, and forcing it to the reading width costs it a column of tiles at
 *   1440px — smaller Drones on exactly the surface where size is the point.
 * - **Reading** screens are read and typed into, one thing at a time.
 *
 * Two named frames still satisfies §3.4 — one column, centred, a stated maximum — and it
 * is written down and enforced (`web/page-frame.test.ts`) rather than drifting again.
 * Recorded in `docs/DECISIONS.md`.
 *
 * Width and centring only. Padding and the gap rhythm stay with the screen, because the
 * Fleet screen stacks two blocks that need the same frame and different vertical space.
 */

/** Fleet, Control — the screens that are looked at. Holds four tiles at 1440px. */
export const INSTRUMENT_FRAME = 'mx-auto w-full max-w-7xl'

/** Lesson, Reports, Students, Settings — the screens that are read and filled in. */
export const READING_FRAME = 'mx-auto w-full max-w-5xl'
