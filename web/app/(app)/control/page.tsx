import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ControlScreen } from '@/components/ControlScreen'

export const metadata: Metadata = {
  title: 'Flight Control Center, Flight Deck, TechTech',
  description: 'Every Drone in the lesson at once, in board order, with what to do about each.',
}

export default function ControlPage() {
  return (
    // Control carries steps 6 to 11, chosen with `?step=` and read on the client.
    // `useSearchParams` suspends during prerender, so the boundary is required.
    <Suspense fallback={<main id="content" className="p-8" />}>
      <ControlScreen />
    </Suspense>
  )
}
