import type { Metadata } from 'next'
import { DemoBoard } from '@/components/DemoBoard'
import { SiteHeader } from '@/components/SiteHeader'

export const metadata: Metadata = {
  title: 'Flight Deck demo · TechTech',
  description: 'The TechTech Flight Deck shown with clearly labelled sample Drone data.',
}

export default function DemoPage() {
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to the Fleet
      </a>
      <SiteHeader />
      <DemoBoard />
    </>
  )
}
