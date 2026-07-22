'use client'

import { useSyncExternalStore } from 'react'
import { Moon, SunMedium } from 'lucide-react'
import { readServerTheme, readTheme, subscribeTheme, writeTheme } from '@/lib/theme'

/**
 * Switches the board between the lit-room and darkened-room themes.
 *
 * The board is read in a classroom, and classrooms have the lights on and the board
 * projected — the condition a dark canvas is least readable in (ADR-0006). The machine's
 * preference is followed by default and overridable, because a projector often disagrees
 * with the laptop driving it.
 *
 * Deliberately the quietest control on screen: it is set once when a room is set up, not
 * touched during a lesson.
 */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, readTheme, readServerTheme) === 'dark'
  const ThemeIcon = dark ? SunMedium : Moon

  return (
    <button
      type="button"
      className="label inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-pill border border-console-line bg-transparent px-3 py-1.5 text-console-muted transition-colors hover:border-ink hover:text-ink"
      onClick={() => writeTheme(dark ? 'light' : 'dark')}
      aria-label={`Switch to the ${dark ? 'lit-room' : 'darkened-room'} theme`}
    >
      <ThemeIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
      {dark ? 'Lit room' : 'Dark room'}
    </button>
  )
}
