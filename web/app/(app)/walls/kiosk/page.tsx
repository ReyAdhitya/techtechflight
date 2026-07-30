import type { Metadata } from 'next'
import { StatusWall } from '@/components/walls/StatusWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Status · Walls · Flight Deck · TechTech',
  description: 'Status, battery, and height for every Drone.',
}

export default function StatusWallPage() {
  return (
    <WallsShell title="Status" description="Status, battery, and height for every Drone.">
      <StatusWall />
    </WallsShell>
  )
}
