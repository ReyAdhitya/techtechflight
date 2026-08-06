import type { Metadata } from 'next'
import { StudentsScreen } from '@/components/StudentsScreen'

export const metadata: Metadata = {
  title: 'Students, Flight Deck, TechTech',
  description: 'The class, and who is flying which Drone.',
}

export default function StudentsPage() {
  return <StudentsScreen />
}
