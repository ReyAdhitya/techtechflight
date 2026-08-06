import type { Metadata } from 'next'
import { AssignmentWall } from '@/components/walls/AssignmentWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Assignments, Walls, Flight Deck, TechTech',
  description: 'Who flies which craft. Readable across the room.',
}

export default function AssignmentWallPage() {
  return (
    <WallsShell
      title="Assignments"
      description="Who flies which craft. Student name large enough to read across the room."
    >
      <AssignmentWall />
    </WallsShell>
  )
}
