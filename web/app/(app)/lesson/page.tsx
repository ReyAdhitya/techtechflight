import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LessonScreen } from '@/components/LessonScreen'

export const metadata: Metadata = {
  title: 'Lesson, Flight Deck, TechTech',
  description: 'The pre-flight check, the lesson while it runs, and what happened afterwards.',
}

export default function LessonPage() {
  return (
    // The set-up step is `?step=`, read on the client. `useSearchParams` suspends during
    // prerender, so the boundary is required rather than defensive (see `/drone`).
    <Suspense fallback={<main id="content" className="p-8" />}>
      <LessonScreen />
    </Suspense>
  )
}
