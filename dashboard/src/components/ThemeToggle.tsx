import { useSyncExternalStore } from 'react'
import { readTheme, subscribeTheme, writeTheme } from '../theme.ts'

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
  const dark = useSyncExternalStore(subscribeTheme, readTheme, () => 'light' as const) === 'dark'

  return (
    <button
      type="button"
      className="display-toggle"
      onClick={() => writeTheme(dark ? 'light' : 'dark')}
      aria-label={`Switch to the ${dark ? 'lit-room' : 'darkened-room'} theme`}
    >
      {dark ? 'Lit room' : 'Dark room'}
    </button>
  )
}
