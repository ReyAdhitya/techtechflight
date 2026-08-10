'use client'

import type { ReactNode } from 'react'
import { FleetProvider } from '@/components/FleetProvider'
import { ClassroomOpen } from '@/components/ClassroomOpen'
import { CommandPalette } from '@/components/CommandPalette'
import { DemoMissionDirector } from '@/components/DemoMissionDirector'
import { RequireRole } from '@/components/RoleGate'
import { SiteHeader } from '@/components/SiteHeader'

/**
 * Everything a Teacher uses, around one connection to the ground station.
 *
 * The board, the timeline, the lesson and the per-Drone view all read the same Fleet.
 * Holding the connection here rather than on each page means moving between them does
 * not reconnect, and — more importantly — two screens can never disagree about what the
 * Fleet is doing, which a socket per page would allow during a reconnect.
 *
 * `/showcase` deliberately sits outside this group: it carries its own chrome and its
 * own scenario switcher, and is a comparison rather than part of the product.
 * Students are gated to `/student` (#627), and `ClassroomOpen` sits here so the classroom
 * a Student joins is written from one place rather than from Lesson and again from Control.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireRole role="teacher">
      <FleetProvider>
        <a className="skip-link" href="#content">
          Skip to the Fleet
        </a>
        <SiteHeader />
        {children}
        <CommandPalette />
        {/* Keeps the Student tablets' brief in step with the Mission the Teacher planned. */}
        <ClassroomOpen />
        {/*
         * The demonstration's one scripted incident, and only when a Teacher armed it in
         * Settings. Here rather than on a screen because it must not stop happening when a
         * Teacher glances at Fleet mid-Mission.
         */}
        <DemoMissionDirector />
      </FleetProvider>
    </RequireRole>
  )
}
