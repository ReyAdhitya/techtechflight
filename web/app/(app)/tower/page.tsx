import type { Metadata } from 'next'
import { MovedToControl } from '@/components/MovedToControl'

export const metadata: Metadata = {
  title: 'Moved · TechTech Readyboard',
  description: 'The Tower is now the Flight Control Center.',
}

/**
 * Where the Tower used to be.
 *
 * A Teacher who bookmarked this, or a projector left on it between lessons, should land on
 * the screen rather than on a 404. Kept as a redirect rather than deleted for as long as
 * that is plausible, which is longer than it takes to rename a route.
 */
export default function TowerPage() {
  return <MovedToControl />
}
