import type { Metadata } from 'next'
import { ShowcaseBoard } from '@/components/showcase/ShowcaseBoard'

export const metadata: Metadata = {
  title: 'Fleet. Maximalist variant',
  description:
    'The same Fleet State as the board, rendered with everything a contemporary dashboard has.',
}

/**
 * The maximalist variant of the Fleet status board.
 *
 * Same Fleet State, same contract, same vocabulary; 3D, motion, glass, depth and the
 * whole shadcn cabinet on top. Built to win if it can — see COMPARISON.md in this
 * directory for what it turned out to cost. Teacher-only via the layout gate.
 */
export default function ShowcasePage() {
  return <ShowcaseBoard />
}
