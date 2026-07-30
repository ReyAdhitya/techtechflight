import type { Metadata } from 'next'
import { HeartbeatWall } from '@/components/walls/HeartbeatWall'
import { WallsShell } from '@/components/walls/WallsShell'

export const metadata: Metadata = {
  title: 'Last Contact · Walls · Flight Deck · TechTech',
  description: 'Which Drones are still responding.',
}

export default function HeartbeatWallPage() {
  return (
    <WallsShell
      title="Last Contact"
      description="One dot per Drone — filled when the link is live, hollow when Telemetry is Stale."
    >
      <HeartbeatWall />
    </WallsShell>
  )
}
