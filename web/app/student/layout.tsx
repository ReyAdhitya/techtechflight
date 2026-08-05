'use client'

import type { ReactNode } from 'react'
import { RequireRole } from '@/components/RoleGate'

/**
 * Student Mission phone — no Teacher nav, no Commands (#627 / #629).
 */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return <RequireRole role="student">{children}</RequireRole>
}
