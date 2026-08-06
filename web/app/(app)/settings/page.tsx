import type { Metadata } from 'next'
import { SettingsScreen } from '@/components/SettingsScreen'

export const metadata: Metadata = {
  title: 'Settings, Flight Deck, TechTech',
  description: 'Connection, appearance, and the records retained by this browser.',
}

export default function SettingsPage() {
  return <SettingsScreen />
}
