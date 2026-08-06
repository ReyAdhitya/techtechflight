'use client'

import type { ReactNode } from 'react'
import { FleetProvider } from '@/components/FleetProvider'
import { RequireRole } from '@/components/RoleGate'

/**
 * The Student's shell. No Teacher nav, no Commands, ever (ADR-0011, #627 / #629).
 *
 * It carries `FleetProvider` because every figure the Student reads is a real Telemetry
 * reading: their craft's charge, its link, its height. Without it the screen would have
 * nothing to read and would be left inventing numbers, which is the one thing it must
 * never do.
 */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="student">
      <FleetProvider>{children}</FleetProvider>
    </RequireRole>
  )
}
