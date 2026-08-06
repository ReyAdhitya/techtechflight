import type { Metadata } from 'next'
import { WallsShell } from '@/components/walls/WallsShell'
import { ProximityWall } from '@/components/walls/ProximityWall'

export const metadata: Metadata = {
  title: 'Proximity, Walls, Flight Deck, TechTech',
  description: 'Pairs of Drones closer than the classroom separation warning.',
}

export default function ProximityWallPage() {
  return (
    <WallsShell
      title="Proximity"
      description="Airborne Drones closer than 1.5 m, one tile per pair."
    >
      <ProximityWall />
    </WallsShell>
  )
}
