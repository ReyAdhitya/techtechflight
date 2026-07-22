import type { ReactNode } from 'react'
import { FleetProvider } from '@/components/FleetProvider'
import { CommandPalette } from '@/components/CommandPalette'
import { SiteHeader } from '@/components/SiteHeader'

/**
 * Everything a Teacher uses, around one connection to the ground station.
 *
 * The board, the timeline, the lesson and the per-Drone view all read the same Fleet.
 * Holding the connection here rather than on each page means moving between them does
 * not reconnect, and — more importantly — two screens can never disagree about what the
 * Fleet is doing, which a socket per page would allow during a reconnect.
 *
 * `/showcase` deliberately sits outside this group: it carries its own chrome and its
 * own scenario switcher, and is a comparison rather than part of the product.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <FleetProvider>
      <a className="skip-link" href="#content">
        Skip to the Fleet
      </a>
      <SiteHeader />
      {children}
      <CommandPalette />
    </FleetProvider>
  )
}
