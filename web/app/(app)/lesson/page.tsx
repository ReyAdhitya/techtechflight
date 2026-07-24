import type { Metadata } from 'next'
import { LessonScreen } from '@/components/LessonScreen'

export const metadata: Metadata = {
  title: 'Lesson · Flight Deck · TechTech',
  description: 'The pre-flight check, the lesson while it runs, and what happened afterwards.',
}

export default function LessonPage() {
  return <LessonScreen />
}
