import type { Metadata } from 'next'
import { ReportsScreen } from '@/components/ReportsScreen'

export const metadata: Metadata = {
  title: 'Reports, Flight Deck, TechTech',
  description: 'What occurred in each Lesson, which Drone shows recurring defects, and when.',
}

/**
 * The standing report screen, and it does not forward anywhere.
 *
 * It used to send a Teacher to the twelfth step of the Mission run, which is locked until a
 * Mission is sealed. On any day with nothing sealed there was no route at all to the digest,
 * the export, the remedial queue or a past Lesson: the whole screen sat behind a step that
 * refused. ADR-0026 always said `/reports` keeps the standing screen behind it, because what
 * happened across a term is not part of one Mission run.
 *
 * Step 12 still shows this screen for the Mission the Teacher just sealed. This route is how
 * they reach it on a Monday morning with nothing running.
 */
export default function ReportsPage() {
  return <ReportsScreen />
}
