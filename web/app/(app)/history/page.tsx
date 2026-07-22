import type { Metadata } from 'next'
import { HistoryScreen } from '@/components/HistoryScreen'

export const metadata: Metadata = {
  title: 'History · TechTech Readyboard',
  description: 'Everything that has happened to the Fleet in the window the ground station keeps.',
}

export default function HistoryPage() {
  return <HistoryScreen />
}
