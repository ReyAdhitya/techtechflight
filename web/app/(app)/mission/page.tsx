import { Suspense } from 'react'
import type { Metadata } from 'next'
import { MissionRunScreen } from '@/components/MissionRunScreen'

export const metadata: Metadata = {
  title: 'Mission run, Flight Deck, TechTech',
  description:
    'The twelve steps of a Mission, from choosing the Scenario to sealing it and reading the debrief.',
}

export default function MissionPage() {
  return (
    // The step is `?step=`, read on the client. `useSearchParams` suspends during
    // prerender, so the boundary is required rather than defensive (see `/drone`).
    <Suspense fallback={<main id="content" className="p-8" />}>
      <MissionRunScreen />
    </Suspense>
  )
}
