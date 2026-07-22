/**
 * The theme, read from `<html data-theme>` rather than mirrored into React state.
 *
 * The attribute is stamped by the boot script in the layout before first paint, so it
 * is the source of truth and every control subscribes to it. Copying it into state
 * inside an effect would re-render on mount and let two controls drift out of sync —
 * see `design.md` §2.
 *
 * Deliberately framework-free: the Vite board carries the same file, so both boards run
 * one theme mechanism instead of this one depending on next-themes and the other having
 * no theme at all.
 */

export type Theme = 'light' | 'dark'

export const THEME_KEY = 'theme'

const listeners = new Set<() => void>()

export function subscribeTheme(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function readTheme(): Theme {
  return document.documentElement.dataset['theme'] === 'dark' ? 'dark' : 'light'
}

/**
 * The server cannot know which theme a Teacher is in. It renders the light reading;
 * the first client snapshot corrects it without a hydration mismatch.
 */
export function readServerTheme(): Theme {
  return 'light'
}

export function writeTheme(next: Theme): void {
  document.documentElement.dataset['theme'] = next
  try {
    window.localStorage.setItem(THEME_KEY, next)
  } catch {
    // A locked-down school browser can refuse storage. The board is already in the
    // right theme; only the memory of the choice is lost.
  }
  listeners.forEach((notify) => notify())
}
