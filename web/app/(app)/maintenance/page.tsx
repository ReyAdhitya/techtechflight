import type { Metadata } from 'next'
import { MovedTo } from '@/components/MovedTo'

export const metadata: Metadata = {
  title: 'Moved, Flight Deck, TechTech',
  description: 'Maintenance is now split between the Fleet screen and Reports.',
}

export default function MaintenancePage() {
  return (
    <MovedTo
      href="/reports"
      what="Outstanding actions are now on the Fleet screen, and recurring defects are in Reports."
      label="Go to Reports"
    />
  )
}
