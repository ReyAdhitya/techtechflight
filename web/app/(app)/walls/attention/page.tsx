import type { Metadata } from 'next'
import { AttentionWall } from '@/components/walls/AttentionWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Attention · Walls · Flight Deck · TechTech',
  description: 'Who needs the Teacher right now.',
}

export default function AttentionWallPage() {
  return (
    <WallsShell
      title="Attention"
      description="Who needs you. Fault, emergency, stale, and alerts still on the queue."
    >
      <AttentionWall />
    </WallsShell>
  )
}
