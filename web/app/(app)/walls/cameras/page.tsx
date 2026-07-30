import type { Metadata } from 'next'
import { WallsShell } from '@/components/walls/WallsShell'
import { WallPlaceholderTiles } from '@/components/walls/WallPlaceholderTiles'

export const metadata: Metadata = {
  title: 'Cameras · Walls · Flight Deck · TechTech',
  description: 'Every fitted camera in the class at once.',
}

export default function CamerasWallPage() {
  return (
    <WallsShell title="Cameras" description="Every fitted camera in the class at once.">
      <WallPlaceholderTiles />
    </WallsShell>
  )
}
