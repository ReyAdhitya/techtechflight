import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './showcase.css'

export const metadata: Metadata = {
  title: 'Fleet — maximalist variant',
  description:
    'The same Fleet State as the board, rendered with everything a contemporary dashboard has.',
}

/**
 * The showcase's own scope.
 *
 * Every token this variant introduces lives under `.showcase` and nothing is added to
 * `globals.css`, so the restrained board at `/` is untouched and the two can be opened
 * in two tabs and judged against each other rather than against a moving target.
 */
export default function ShowcaseLayout({ children }: { children: ReactNode }) {
  return (
    <div className="showcase">
      <div className="sc-aurora" aria-hidden="true" />
      <div className="sc-content">{children}</div>
    </div>
  )
}
