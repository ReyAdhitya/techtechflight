import type { Metadata } from 'next'
import { RecordsScreen } from '@/components/RecordsScreen'

export const metadata: Metadata = {
  title: 'Records, Flight Deck, TechTech',
  description: 'Who is in the class and how they are doing, and what one child has done.',
}

/**
 * Records: the class, and one child.
 *
 * Two questions and no more (ADR-0035). **Reports** is a different screen and a different
 * question — what happened in a Lesson, which Drone shows recurring defects — and the two are
 * kept apart on purpose: a Teacher asking about a child should not have to read past a Fleet
 * digest to find them.
 */
export default function RecordsPage() {
  return (
    <main id="content" tabIndex={-1} className="mx-auto w-full max-w-[70rem] p-6 min-[48rem]:p-10">
      <RecordsScreen />
    </main>
  )
}
