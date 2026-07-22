import type { Metadata } from 'next'
import { ReportsScreen } from '@/components/ReportsScreen'

export const metadata: Metadata = {
  title: 'Reports · TechTech Readyboard',
  description: 'What happened in each Lesson, which Drone keeps giving trouble, and when.',
}

export default function ReportsPage() {
  return <ReportsScreen />
}
