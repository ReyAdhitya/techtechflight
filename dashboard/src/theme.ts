/**
 * The theme, read from `<html data-theme>` rather than mirrored into React state.
 *
 * The attribute is stamped in `main.tsx` before the first render, so it is the source of
 * truth and every control subscribes to it. Copying it into state inside an effect would
 * re-render on mount and let two controls drift out of sync — see `design.md` §2.
 *
 * The same file exists in `web/lib/theme.ts`. Making the theme an attribute rather than a
 * next-themes class is what lets one mechanism drive both boards — and is why this board,
 * which had no theme at all, now carries ADR-0006's light theme too.
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

/** The stored choice if there is one, otherwise whatever the machine prefers. */
export function resolveInitialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // A locked-down school browser can refuse storage. Fall through to the machine.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function writeTheme(next: Theme): void {
  document.documentElement.dataset['theme'] = next
  try {
    window.localStorage.setItem(THEME_KEY, next)
  } catch {
    // The board is already in the right theme; only the memory of the choice is lost.
  }
  listeners.forEach((notify) => notify())
}
