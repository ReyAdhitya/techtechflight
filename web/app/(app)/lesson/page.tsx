import type { Metadata } from 'next'
import { MissionStepForward } from '@/components/MissionStepForward'

export const metadata: Metadata = {
  title: 'Lesson, Flight Deck, TechTech',
  description: 'Setting a Mission up is the first five steps of the Mission run.',
}

export default function LessonPage() {
  // Set-up is steps 1 to 5 on `/mission` now (ADR-0026). The route still resolves.
  return <MissionStepForward step={1} what="Setting the Mission up" />
}
