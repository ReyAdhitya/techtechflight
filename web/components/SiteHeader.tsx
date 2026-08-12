'use client'

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { SimulationLabel } from './SimulationLabel'
import { SiteNavButton, SiteNavPanel, useSiteNavDismiss } from './SiteNav'
import { SwitchRoleButton } from './SwitchRoleButton'
import { ThemeToggle } from './ThemeToggle'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * The bar: who we are and where to go on the left, the room controls on the right.
 *
 * **Go to sits beside the logo.** It used to sit in the middle, which reads as wrong before
 * you have noticed anything else about the bar: navigation does not belong in the centre.
 *
 * **The panel it opens is a row of this bar, not a dropdown over the page.** Anchored to the
 * button it covered the status bar underneath — the strip that says which Fleet a Teacher is
 * looking at — so the thing you opened hid the thing that says what you are looking at. Here
 * it pushes the status bar down instead, which costs nothing and hides nothing.
 *
 * **Nothing in this bar may wrap.** Settings used to fall onto a second row on a narrow
 * screen and appear in a strange corner, because it was loose grey text with no width of its
 * own beside three pills. It is a control now, and on the widths where the row still cannot
 * hold them all the controls fold into the sheet.
 *
 * Two physical states from design.md §6 — docked (merged with the page) until scroll,
 * then floating with blur and elevation. Motion is entrance only; the dock/float change
 * is a CSS transition on transform-safe properties.
 */
export function SiteHeader() {
  const [floating, setFloating] = useState(false)
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const menuId = useId()
  const shellRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => setOpen(false), [])

  useSiteNavDismiss({ open, close, within: shellRef, buttonRef })

  useEffect(() => {
    const onScroll = () => setFloating(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /*
   * One copy, in the row or in the sheet and never both. Rendering them twice and hiding one
   * with CSS would put two Switch role buttons in the accessibility tree of every screen, and
   * `display: none` is the only thing keeping the second out of a Teacher's Tab order.
   */
  const narrow = useNarrowBar()
  const controls = (
    <>
      <ThemeToggle />
      <SwitchRoleButton label="Switch role" />
      {/*
       * Not in the navigation: the room and the records, rather than a place to go. It is a
       * control rather than loose text, so it has a width of its own and stops falling out
       * of the row.
       */}
      <Link href="/settings" prefetch={false} className="site-header__settings">
        Settings
      </Link>
    </>
  )

  return (
    <div
      className="site-header-shell"
      data-floating={floating ? 'true' : 'false'}
      ref={shellRef}
    >
      <motion.header
        className="site-header"
        data-floating={floating ? 'true' : 'false'}
        initial={reduced ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.55, ease: EASE }}
      >
        <div className="site-header__row">
          <div className="site-header__left">
            <BrandMark />
            <SiteNavButton
              open={open}
              onToggle={() => setOpen((wasOpen) => !wasOpen)}
              menuId={menuId}
              buttonRef={buttonRef}
            />
          </div>

          {narrow ? null : <div className="site-header__controls">{controls}</div>}
        </div>

        <SiteNavPanel open={open} onClose={close} menuId={menuId}>
          {narrow ? controls : undefined}
        </SiteNavPanel>
      </motion.header>

      <SimulationLabel />
    </div>
  )
}

/**
 * Whether the bar is too narrow to hold the room controls beside the logo.
 *
 * 48rem, the same rung the rest of the chrome turns at. False on the server and false in a
 * test environment with no `matchMedia`, which is the honest default: a bar that guessed
 * narrow would hide four controls on a laptop until the first effect ran.
 */
function useNarrowBar(): boolean {
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(max-width: 48rem)')
    const read = () => setNarrow(query.matches)
    read()
    query.addEventListener('change', read)
    return () => query.removeEventListener('change', read)
  }, [])

  return narrow
}

/**
 * The company logo — transparent mark, rendered in ink for the active theme.
 *
 * The mark is also the way to the Flight Control Center (#96), which is not where a header
 * logo conventionally goes. See `docs/DECISIONS.md`.
 *
 * **Only the mark is the link.** "Flight Deck" beside it is the product name rather than part
 * of the logo, and the divider rule between them already says they are two things.
 *
 * Falls back to the wordmark in the board's display face when the asset is absent. There the
 * wordmark *is* the mark, so it is what takes the link.
 */
function BrandMark() {
  const [assetMissing, setAssetMissing] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth === 0) setAssetMissing(true)
  }, [])

  if (assetMissing) {
    return (
      <BrandLink>
        <span className="brand-wordmark" role="img" aria-label="TechTech Flight Deck">
          TechTech <strong>Flight Deck</strong>
        </span>
      </BrandLink>
    )
  }

  return (
    <span className="brand-lockup">
      <BrandLink>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src="/logo-mark.png"
          /*
           * Named rather than presentational, which the link is the reason for. The lockup
           * used to carry `role="img"` on behalf of the pair, and a `role="img"` subtree is
           * presentational — the link inside it would have been dropped from the
           * accessibility tree entirely, taking the keyboard route with it.
           */
          alt="TechTech Flight Deck"
          className="brand-mark"
          onError={() => setAssetMissing(true)}
        />
      </BrandLink>
      <span className="brand-product" aria-hidden="true">
        Flight Deck
      </span>
    </span>
  )
}

/**
 * The logo's hit area.
 *
 * Height comes from CSS rather than from a larger image: the mark is 1.75rem tall and a
 * finger needs 2.75rem, which is what every other control in this bar already stands at, so
 * the target grows to the row it sits in without the row growing at all.
 *
 * It goes to the Mission run, which is where it always went: that used to be called Control
 * and is now the one page holding all twelve steps. A Teacher who has wandered off to Fleet
 * or Walls presses the logo to get back to the hour they are teaching.
 *
 * **Enter activates it, not Space.** It goes somewhere, so it is a link; Space belongs to
 * buttons and to scrolling the page, and taking it here would break both.
 */
function BrandLink({ children }: { children: ReactNode }) {
  return (
    <Link
      href="/mission"
      /* Nothing to prefetch on a static export. See the note in `SiteNav`. */
      prefetch={false}
      className="brand-link"
      aria-label="TechTech Flight Deck, go to the Mission run"
    >
      {children}
    </Link>
  )
}
