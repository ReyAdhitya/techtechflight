import type { Metadata } from 'next'
import { WallsShell } from '@/components/walls/WallsShell'
import { SpotlightWall } from '@/components/walls/SpotlightWall'

export const metadata: Metadata = {
  title: 'Spotlight · Walls · Flight Deck · TechTech',
  description: 'One large camera with a thumbnail row for the rest of the class.',
}

export default function SpotlightWallPage() {
  return (
    <WallsShell
      title="Spotlight"
      description="One large camera — pick another from the row below."
    >
      <SpotlightWall />
    </WallsShell>
  )
}
