import type { Metadata } from 'next'
import { VisionCheckScreen } from '@/components/VisionCheckScreen'

export const metadata: Metadata = {
  title: 'Vision check, Flight Deck, TechTech',
  description: 'Whether the camera and the detection model work on this machine.',
}

export default function VisionPage() {
  return <VisionCheckScreen />
}
