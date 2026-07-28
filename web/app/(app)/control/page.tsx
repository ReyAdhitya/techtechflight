import type { Metadata } from 'next'
import { ControlScreen } from '@/components/ControlScreen'

export const metadata: Metadata = {
  title: 'Flight Control Center · Flight Deck · TechTech',
  description: 'Every Drone in the lesson at once, in board order, with what to do about each.',
}

export default function ControlPage() {
  return <ControlScreen />
}
