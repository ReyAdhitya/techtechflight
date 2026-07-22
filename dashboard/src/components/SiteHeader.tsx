import { useEffect, useRef, useState } from 'react'
import { DisplayScaleToggle } from './DisplayScaleToggle.tsx'
import { ThemeToggle } from './ThemeToggle.tsx'

/**
 * The floating bar: identity on the left, the room controls on the right.
 *
 * It is a header rather than a navigation bar, because there is nowhere to navigate to —
 * the Fleet is the whole product and it lives on one screen. Rendering tabs for a single
 * destination would promise sub-screens a Teacher will look for and not find.
 *
 * It floats using the system's own elevation language: a hairline and a lighter surface,
 * exactly as a tile does. No shadow and no blur, because ADR-0004 has no shadow tier.
 *
 * Both boards now carry the same two controls. ADR-0006's light theme used to live in
 * `web/` alone because it was wired to next-themes; moving the theme onto a `data-theme`
 * attribute (design.md §2) is what let this board have it too.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <BrandMark />

      <div className="site-header__controls">
        <ThemeToggle />
        <DisplayScaleToggle />
      </div>
    </header>
  )
}

/**
 * The logo, in ink rather than in brand amber.
 *
 * Colour means exception here: a healthy board is monochrome, and the whole signal rests
 * on colour arriving only when something needs the Teacher. Marigold sits within a few
 * degrees of the Not Ready hue, so a permanently coloured mark would put status colour on
 * screen at all times and teach the eye to ignore the one thing it must not. Marigold is
 * identity on this surface, never an instrument reading — see design.md §9 and ADR-0009.
 *
 * Falls back to the wordmark set in the board's own display face when the asset is
 * absent, so a missing file is a quieter logo rather than a broken board.
 */
function BrandMark() {
  const [assetMissing, setAssetMissing] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  /*
   * `onError` alone is not enough: a load that fails before the handler is attached
   * fires its error event into nothing, and the board is left showing a broken-image
   * box. Asking the element itself on mount catches a failure whenever it happened —
   * `complete` with no intrinsic width is a load that gave up.
   */
  useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth === 0) setAssetMissing(true)
  }, [])

  if (assetMissing) {
    return (
      <span className="brand-wordmark" role="img" aria-label="TechTech Technology">
        TechTech Technology
      </span>
    )
  }

  return (
    <img
      ref={imageRef}
      src="/logo-mark.png"
      alt="TechTech Technology"
      className="brand-mark"
      onError={() => setAssetMissing(true)}
    />
  )
}
