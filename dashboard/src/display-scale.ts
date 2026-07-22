/**
 * Large format, for a projector or a board read from across the room.
 *
 * ADR-0006 added a light theme because the room decides what is readable. This is the
 * other half of that argument: the same room also decides how big the board has to be,
 * and a lit classroom with the board projected at the front is not the size a laptop
 * sitting on a desk is designed for.
 *
 * It is a multiplier on the root font size, not a set of larger values, so it magnifies
 * whatever the Teacher has already told their browser they need rather than replacing
 * it. Everything on the board is expressed in rem, so this one number carries all of it.
 */

const STORAGE_KEY = 'techtechflight:display-scale'

/** Whether the board should currently be in large format. Safe before the DOM exists. */
export function readDisplayScale(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'large'
  } catch {
    // A locked-down school browser can refuse storage outright. The board still works;
    // it just forgets the choice, which is better than not rendering.
    return false
  }
}

export function applyDisplayScale(large: boolean): void {
  if (typeof document === 'undefined') return

  if (large) document.documentElement.dataset['display'] = 'large'
  else delete document.documentElement.dataset['display']

  try {
    window.localStorage.setItem(STORAGE_KEY, large ? 'large' : 'standard')
  } catch {
    // See above. The board is already the right size; only the memory of it is lost.
  }
}
