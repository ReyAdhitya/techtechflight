'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DisplayScaleToggle } from './DisplayScaleToggle'
import { ThemeToggle } from './ThemeToggle'

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

        <div className="site-header__controls">
          <ThemeToggle />
          <DisplayScaleToggle />
        </div>
      </motion.header>
    </div>
  )
}

/**
 * The company logo — transparent mark, rendered in ink for the active theme.
 *
 * Falls back to the wordmark in the board's display face when the asset is absent.
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
      <span className="brand-wordmark" role="img" aria-label="TechTech Readyboard">
        TechTech <strong>Readyboard</strong>
      </span>
    )
  }

  return (
    <span className="brand-lockup" role="img" aria-label="TechTech Readyboard">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src="/logo-mark.png"
        alt=""
        className="brand-mark"
        onError={() => setAssetMissing(true)}
      />
      <span className="brand-product" aria-hidden="true">
        Readyboard
      </span>
    </span>
  )
}
