import { useState } from 'react'
import { applyDisplayScale, readDisplayScale } from '../display-scale.ts'

/**
 * Switches the board into large format.
 *
 * Deliberately the same weight of control as the theme toggle, and for the same reason:
 * it is set once when a room is set up, not touched during a lesson. The label names
 * what pressing it will do rather than what the board currently is, so a Teacher never
 * has to work out which way round it reads.
 */
export function DisplayScaleToggle() {
  const [large, setLarge] = useState(readDisplayScale)

  const toggle = () => {
    const next = !large
    setLarge(next)
    applyDisplayScale(next)
  }

  return (
    <button
      type="button"
      className="display-toggle"
      onClick={toggle}
      aria-label={large ? 'Switch to standard size' : 'Switch to large format'}
    >
      {large ? 'Standard size' : 'Large format'}
    </button>
  )
}
