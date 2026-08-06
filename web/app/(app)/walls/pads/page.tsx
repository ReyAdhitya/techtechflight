import type { Metadata } from 'next'
import { PadWall } from '@/components/walls/PadWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Landing pads · Walls · Flight Deck · TechTech',
  description: 'Which Drones see a landing-pad QR on the camera picture.',
}

export default function PadWallPage() {
  return (
    <WallsShell
      title="Landing pads"
      description="Landing-pad QR seen or not on each Drone's camera picture. Read-only. Never written into Telemetry."
    >
      <PadWall />
    </WallsShell>
  )
}
