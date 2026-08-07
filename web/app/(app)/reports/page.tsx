import type { Metadata } from 'next'
import { MissionStepForward } from '@/components/MissionStepForward'

export const metadata: Metadata = {
  title: 'Reports, Flight Deck, TechTech',
  description: 'Logs, scores and the debrief are step 12 of the Mission run.',
}

export default function ReportsPage() {
  // The debrief is step 12 on `/mission` now (ADR-0026). The route still resolves.
  return <MissionStepForward step={12} what="Logs, scores and the debrief" />
}
