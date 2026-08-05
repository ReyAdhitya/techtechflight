'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { SimulationLabel } from './SimulationLabel'
import { SiteNav } from './SiteNav'
import { ThemeToggle } from './ThemeToggle'
import { clearBoardRole } from '@/lib/role'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * The bar: identity on the left, the room controls on the right.
 *
 * Two physical states from design.md §6 — docked (merged with the page) until scroll,
 * then floating with blur and elevation. Motion is entrance only; the dock/float change
 * is a CSS transition on transform-safe properties.
 */
export function SiteHeader() {
  const [floating, setFloating] = useState(false)
  const reduced = useReducedMotion()
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setFloating(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="site-header-shell" data-floating={floating ? 'true' : 'false'}>
      <motion.header
        className="site-header"
        data-floating={floating ? 'true' : 'false'}
        initial={reduced ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : { duration: 0.55, ease: EASE }}
      >
        <BrandMark />

        <SiteNav />

        <div className="site-header__controls">
          <ThemeToggle />
          <button
            type="button"
            className="site-header__settings"
            aria-label="Switch between Student and Teacher"
            onClick={() => {
              clearBoardRole()
              router.push('/enter')
            }}
          >
            Role
          </button>
          {/* Not in the navigation: the room and the records, rather than a place to go. */}
          <Link href="/settings" prefetch={false} className="site-header__settings">
            Settings
          </Link>
        </div>
      </motion.header>

      <SimulationLabel />
    </div>
  )
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
 * finger needs 2.75rem, which is what every other control in this bar already stands at — so
 * the target grows to the row it sits in without the row growing at all.
 *
 * **Enter activates it, not Space.** It goes somewhere, so it is a link; Space belongs to
 * buttons and to scrolling the page, and taking it here would break both.
 */
function BrandLink({ children }: { children: ReactNode }) {
  return (
    <Link
      href="/control"
      /* Nothing to prefetch on a static export — see the note in `SiteNav`. */
      prefetch={false}
      className="brand-link"
      aria-label="TechTech Flight Deck — go to Control"
    >
      {children}
    </Link>
  )
}
