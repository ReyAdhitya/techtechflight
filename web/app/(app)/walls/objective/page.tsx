import type { Metadata } from 'next'
import { ObjectiveWall } from '@/components/walls/ObjectiveWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Objective · Walls · Flight Deck · TechTech',
  description: "Today's objective in one sentence from the running Lesson.",
}

export default function ObjectiveWallPage() {
  return (
    <WallsShell
      title="Objective"
      description="One sentence from the running Lesson — large enough for the class."
    >
      <ObjectiveWall />
    </WallsShell>
  )
}
