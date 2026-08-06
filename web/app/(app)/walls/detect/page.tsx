import type { Metadata } from 'next'
import { DetectWall } from '@/components/walls/DetectWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Detections, Walls, Flight Deck, TechTech',
  description: 'Object detection counts across every Drone.',
}

export default function DetectWallPage() {
  return (
    <WallsShell
      title="Detections"
      description="Object detection counts across every Drone. Sim cameras with an active feed only."
    >
      <DetectWall />
    </WallsShell>
  )
}
