import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WallsShell } from '@/components/walls/WallsShell'
import { DualWatch } from '@/components/walls/DualWatch'

export const metadata: Metadata = {
  title: 'Dual · Walls · Flight Deck · TechTech',
  description: 'Two cameras side by side for a close comparison.',
}

export default function DualWallPage() {
  return (
    <WallsShell
      title="Dual"
      description="Two cameras side by side. Pass ?a= and ?b= drone ids; defaults to the first two."
    >
      <Suspense fallback={<p className="m-0 text-body text-ink-muted">Loading…</p>}>
        <DualWatch />
      </Suspense>
    </WallsShell>
  )
}
