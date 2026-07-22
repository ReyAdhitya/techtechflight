import type { Metadata } from 'next'
import { ControlScreen } from '@/components/ControlScreen'

export const metadata: Metadata = {
  title: 'Flight Control Center · TechTech Readyboard',
  description: 'Every Drone in the lesson at once, worst first, with what to do about each.',
}

export default function ControlPage() {
  return <ControlScreen />
}
