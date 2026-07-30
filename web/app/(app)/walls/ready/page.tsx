import type { Metadata } from 'next'
import { WallsShell } from '@/components/walls/WallsShell'
import { WallPlaceholderTiles } from '@/components/walls/WallPlaceholderTiles'

export const metadata: Metadata = {
  title: 'Ready · Walls · Flight Deck · TechTech',
  description: 'Who is ready to fly before the lesson starts.',
}

export default function ReadyWallPage() {
  return (
    <WallsShell title="Ready" description="Who is ready to fly before the lesson starts.">
      <WallPlaceholderTiles />
    </WallsShell>
  )
}
