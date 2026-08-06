import type { Metadata } from 'next'
import { WallsShell } from '@/components/walls/WallsShell'
import { LandingWatch } from '@/components/walls/LandingWatch'

export const metadata: Metadata = {
  title: 'Landing, Walls, Flight Deck, TechTech',
  description: 'Who is coming down. Phase and height at a glance.',
}

export default function LandingWatchPage() {
  return (
    <WallsShell
      title="Landing"
      description="Who is coming down. Landing phase, airborne state, and height."
    >
      <LandingWatch />
    </WallsShell>
  )
}
