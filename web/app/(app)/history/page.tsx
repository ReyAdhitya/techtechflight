import type { Metadata } from 'next'
import { MovedTo } from '@/components/MovedTo'

export const metadata: Metadata = {
  title: 'Moved · TechTech Readyboard',
  description: 'The timeline is now part of Reports.',
}

export default function HistoryPage() {
  return <MovedTo href="/reports" what="The timeline is now part of Reports." label="Go to Reports" />
}
