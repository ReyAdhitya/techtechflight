import type { Metadata } from 'next'
import { TowerScreen } from '@/components/TowerScreen'

export const metadata: Metadata = {
  title: 'Tower · TechTech Readyboard',
  description: 'Every Drone in the lesson at once, worst first, with what to do about each.',
}

export default function TowerPage() {
  return <TowerScreen />
}
