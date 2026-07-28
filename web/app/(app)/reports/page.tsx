import type { Metadata } from 'next'
import { ReportsScreen } from '@/components/ReportsScreen'

export const metadata: Metadata = {
  title: 'Reports · Flight Deck · TechTech',
  description: 'What occurred in each Lesson, which Drone shows recurring defects, and when.',
}

export default function ReportsPage() {
  return <ReportsScreen />
}
