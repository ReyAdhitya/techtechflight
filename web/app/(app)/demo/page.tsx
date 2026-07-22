import type { Metadata } from 'next'
import { FleetScreen } from '@/components/FleetScreen'

export const metadata: Metadata = {
  title: 'Readyboard demo · TechTech',
  description: 'The TechTech Readyboard shown with clearly labelled sample Drone data.',
}

/**
 * The board with no ground station behind it.
 *
 * Same screen as `/`, same components — the group's provider recognises this path and
 * supplies fixtures instead of a socket, and the banner says so. Keeping it one screen
 * rather than two means the demonstration cannot quietly drift away from the product.
 */
export default function DemoPage() {
  return <FleetScreen />
}
