'use client'

import { useSyncExternalStore } from 'react'
import { Moon, SunMedium } from 'lucide-react'
import { readServerTheme, readTheme, subscribeTheme, writeTheme } from '@/lib/theme'

/**
 * Switches the board between the lit-room and darkened-room themes.
 *
 * Icon only — the words stay on the accessible name (#623). Classrooms have the lights on
 * and the board projected, which is the condition a dark canvas is least readable in
 * (ADR-0006).
 */
export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, readTheme, readServerTheme) === 'dark'
  const ThemeIcon = dark ? SunMedium : Moon

  return (
    <button
      type="button"
      className="label inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-pill border border-console-line bg-transparent px-3 py-1.5 text-console-muted transition-colors hover:border-ink hover:text-ink"
      onClick={() => writeTheme(dark ? 'light' : 'dark')}
      aria-label={`Switch to the ${dark ? 'lit-room' : 'darkened-room'} theme`}
      title={dark ? 'Lit room' : 'Dark room'}
    >
      <ThemeIcon className="size-4" strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}
