import type { Metadata } from 'next'
import { CameraWall } from '@/components/walls/CameraWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Projector · Walls · Flight Deck · TechTech',
  description: 'Cameras wall for the class projector.',
}

export default function ProjectorWallPage() {
  return (
    <WallsShell title="Projector" description="Cameras wall for the class projector.">
      <CameraWall />
    </WallsShell>
  )
}
