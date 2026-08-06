'use client'

import { useEffect, useState } from 'react'
import { Minimize2, Projector } from 'lucide-react'
import { applyDisplayScale, readDisplayScale } from '@/lib/display-scale'

/**
 * Large format ↔ standard — icon only, beside the theme control.
 *
 * Same job as ThemeToggle: room setup, once. The projector mark means "make this
 * readable across the room"; minimise means "back to desk size".
 */
export function DisplayScaleToggle() {
  const [large, setLarge] = useState(false)
  const [mounted, setMounted] = useState(false)

  /*
   * The stored choice is unknowable until the client has read it, and rendering a guess
   * would swap the control under a Teacher on hydration.
   *
   * This re-applies the stored value rather than trusting the layout's pre-paint script
   * to have done it. That script exists only to avoid a flash, and it is not the source
   * of truth.
   */
  useEffect(() => {
    const stored = readDisplayScale()
    applyDisplayScale(stored)
    setLarge(stored)
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = !large
    setLarge(next)
    applyDisplayScale(next)
  }
  const ScaleIcon = mounted && large ? Minimize2 : Projector
  const label = !mounted
    ? 'Switch display size'
    : large
      ? 'Switch to standard size'
      : 'Switch to large format'
  const tip = !mounted ? 'Size' : large ? 'Standard size' : 'Large format'

  return (
    <button
      type="button"
      className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-pill border border-hairline bg-transparent text-ink-muted transition-colors hover:border-ink hover:text-ink"
      onClick={toggle}
      aria-label={label}
      title={tip}
    >
      <ScaleIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}
