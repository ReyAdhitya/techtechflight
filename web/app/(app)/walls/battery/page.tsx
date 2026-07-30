import type { Metadata } from 'next'
import { WallsShell } from '@/components/walls/WallsShell'
import { WallPlaceholderTiles } from '@/components/walls/WallPlaceholderTiles'

export const metadata: Metadata = {
  title: 'Battery · Walls · Flight Deck · TechTech',
  description: 'Charge across every Drone in the class.',
}

export default function BatteryWallPage() {
  return (
    <WallsShell title="Battery" description="Charge across every Drone in the class.">
      <WallPlaceholderTiles />
    </WallsShell>
  )
}
