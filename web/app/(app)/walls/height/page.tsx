import type { Metadata } from 'next'
import { HeightWall } from '@/components/walls/HeightWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Height · Walls · Flight Deck · TechTech',
  description: 'Height across every Drone in the class.',
}

export default function HeightWallPage() {
  return (
    <WallsShell title="Height" description="Height across every Drone in the class.">
      <HeightWall />
    </WallsShell>
  )
}
