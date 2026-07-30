import type { Metadata } from 'next'
import { LandedWall } from '@/components/walls/LandedWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Landed · Walls · Flight Deck · TechTech',
  description: 'Who has landed and who is still in the air at the end of a lesson.',
}

export default function LandedWallPage() {
  return (
    <WallsShell
      title="Landed"
      description="Green when a Drone is on the ground, red when it is still airborne."
    >
      <LandedWall />
    </WallsShell>
  )
}
