import { Suspense } from 'react'
import type { Metadata } from 'next'
import { DroneScreen } from '@/components/DroneScreen'

export const metadata: Metadata = {
  title: 'Drone, Flight Deck, TechTech',
  description: 'Everything one Drone is reporting, and everything it has done today.',
}

/**
 * One Drone in full.
 *
 * The Drone is chosen with `?id=`, read on the client, rather than by a path segment.
 * A static export has to know every route at build time (ADR-0005), and the Fleet is
 * whatever the ground station says it is — so a path like `/drone/ttf-0001` could only
 * ever exist for Drones that happened to be registered when the board was built.
 */
export default function DronePage() {
  return (
    // `useSearchParams` suspends during prerender, so the boundary is required rather
    // than defensive.
    <Suspense fallback={<main id="content" className="p-8" />}>
      <DroneScreen />
    </Suspense>
  )
}
