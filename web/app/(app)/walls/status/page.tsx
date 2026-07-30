import type { Metadata } from 'next'
import { WallsShell } from '@/components/walls/WallsShell'
import { WallPlaceholderTiles } from '@/components/walls/WallPlaceholderTiles'

export const metadata: Metadata = {
  title: 'Status · Walls · Flight Deck · TechTech',
  description: 'Status, battery, and height for every Drone.',
}

export default function StatusWallPage() {
  return (
    <WallsShell title="Status" description="Status, battery, and height for every Drone.">
      <WallPlaceholderTiles />
    </WallsShell>
  )
}
