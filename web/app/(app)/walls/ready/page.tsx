import type { Metadata } from 'next'
import { ReadyWall } from '@/components/walls/ReadyWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Ready · Walls · Flight Deck · TechTech',
  description: 'Who is ready to fly before the lesson starts.',
}

export default function ReadyWallPage() {
  return (
    <WallsShell title="Ready" description="Who is ready to fly before the lesson starts.">
      <ReadyWall />
    </WallsShell>
  )
}
