import type { Metadata } from 'next'
import { FaultMosaic } from '@/components/walls/FaultMosaic'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Faults · Walls · Flight Deck · TechTech',
  description: 'Fault, stale, and emergency Drones first — the rest follow.',
}

export default function FaultMosaicPage() {
  return (
    <WallsShell
      title="Faults"
      description="Fault, stale, and emergency Drones first — the rest follow."
    >
      <FaultMosaic />
    </WallsShell>
  )
}
