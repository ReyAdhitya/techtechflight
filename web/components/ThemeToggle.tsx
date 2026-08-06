'use client'

import { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'
import { readServerTheme, readTheme, subscribeTheme, writeTheme } from '@/lib/theme'

/**
 * Lit room ↔ dark room — icon only, in the header control cluster.
 *
 * Set once when the room is set up (lights on vs projector), not during a lesson.
 * The words stay in the accessible name; the bar stays quiet.
 */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, readTheme, readServerTheme) === 'dark'
  const ThemeIcon = dark ? Sun : Moon

  return (
    <button
      type="button"
      className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-pill border border-hairline bg-transparent text-ink-muted transition-colors hover:border-ink hover:text-ink"
      onClick={() => writeTheme(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to lit room' : 'Switch to dark room'}
      title={dark ? 'Lit room' : 'Dark room'}
    >
      <ThemeIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}
