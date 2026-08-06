import type { Metadata } from 'next'
import { BatteryWall } from '@/components/walls/BatteryWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Battery, Walls, Flight Deck, TechTech',
  description: 'Charge across every Drone in the class.',
}

export default function BatteryWallPage() {
  return (
    <WallsShell title="Battery" description="Charge across every Drone in the class.">
      <BatteryWall />
    </WallsShell>
  )
}
