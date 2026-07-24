import type { Metadata } from 'next'
import { MovedTo } from '@/components/MovedTo'

export const metadata: Metadata = {
  title: 'Moved · Flight Deck · TechTech',
  description: 'Maintenance is now split between the Fleet screen and Reports.',
}

export default function MaintenancePage() {
  return (
    <MovedTo
      href="/reports"
      what="What needs doing is now on the Fleet screen, and which Drones keep giving trouble is in Reports."
      label="Go to Reports"
    />
  )
}
