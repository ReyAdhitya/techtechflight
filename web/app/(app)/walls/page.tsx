import type { Metadata } from 'next'
import { WallsHub } from '@/components/walls/WallsHub'

export const metadata: Metadata = {
  title: 'Walls, Flight Deck, TechTech',
  description: 'See the whole class at once. Cameras, status, ready, and battery walls.',
}

export default function WallsPage() {
  return <WallsHub />
}
