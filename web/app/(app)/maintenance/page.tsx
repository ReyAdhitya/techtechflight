import type { Metadata } from 'next'
import { MaintenanceScreen } from '@/components/MaintenanceScreen'

export const metadata: Metadata = {
  title: 'Maintenance · TechTech Readyboard',
  description: 'What needs doing now, and which Drones keep giving trouble.',
}

export default function MaintenancePage() {
  return <MaintenanceScreen />
}
