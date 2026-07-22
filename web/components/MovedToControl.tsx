'use client'

import { MovedTo } from './MovedTo'

/** Where the Tower used to be. A Teacher may have bookmarked it, or left a projector on it. */
export function MovedToControl() {
  return (
    <MovedTo
      href="/control"
      what="The Tower is now the Flight Control Center."
      label="Go there"
    />
  )
}
