import type { Metadata } from 'next'
import { MissionStepForward } from '@/components/MissionStepForward'

export const metadata: Metadata = {
  title: 'Flight Control Center, Flight Deck, TechTech',
  description: 'The live board is steps 6 to 11 of the Mission run.',
}

export default function ControlPage() {
  // The live board is steps 6 to 11 on `/mission` now (ADR-0026). The route still resolves.
  return <MissionStepForward step={6} what="The Flight Control Center" />
}
