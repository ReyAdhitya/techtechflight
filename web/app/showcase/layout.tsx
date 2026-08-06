'use client'

import type { ReactNode } from 'react'
import { RequireRole } from '@/components/RoleGate'

import './showcase.css'

/**
 * The showcase's own scope — Teacher only.
 *
 * Students stay on `/student`. Every token this variant introduces lives under
 * `.showcase` and nothing is added to `globals.css`.
 */
export default function ShowcaseLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="teacher">
      <div className="showcase">
        <div className="sc-aurora" aria-hidden="true" />
        <div className="sc-content">{children}</div>
      </div>
    </RequireRole>
  )
}
