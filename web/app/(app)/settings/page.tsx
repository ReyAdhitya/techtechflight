import type { Metadata } from 'next'
import { SettingsScreen } from '@/components/SettingsScreen'

export const metadata: Metadata = {
  title: 'Settings · TechTech Readyboard',
  description: 'Connection, appearance, and the records this browser is keeping for you.',
}

export default function SettingsPage() {
  return <SettingsScreen />
}
