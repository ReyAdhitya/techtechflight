import type { Metadata } from 'next'
import { WallsTvMode } from '@/components/walls/WallsTvMode'

export const metadata: Metadata = {
  title: 'TV · Walls · Flight Deck · TechTech',
  description: 'Fullscreen Cameras or Status for a classroom display.',
}

export default function WallsTvPage() {
  return <WallsTvMode />
}
