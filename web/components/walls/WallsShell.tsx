'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { INSTRUMENT_FRAME } from '@/lib/frame'
import { cn } from '@/lib/utils'

/**
 * Shared chrome for every Classroom Wall.
 *
 * Title, a calm way back to the hub, and the screen body. Sub-walls fill `children`;
 * they do not invent their own page frame.
 */
export function WallsShell({
  title,
  description,
  children,
  hideBack = false,
}: {
  title: string
  description?: string
  children: ReactNode
  /** Hub itself has nowhere to go back to. */
  hideBack?: boolean
}) {
  return (
    <main
      id="content"
      tabIndex={-1}
      className={cn(INSTRUMENT_FRAME, 'flex flex-col gap-6 p-4 min-[26rem]:p-8')}
    >
      <header className="flex flex-col gap-2">
        {!hideBack ? (
          <Link
            href="/walls"
            prefetch={false}
            className="w-fit text-caption text-ink-subtle underline-offset-4 hover:underline"
          >
            All walls
          </Link>
        ) : null}
        <h1 className="m-0 font-display text-summary font-medium text-ink">{title}</h1>
        {description ? (
          <p className="m-0 max-w-prose text-body text-ink-subtle">{description}</p>
        ) : null}
      </header>
      {children}
    </main>
  )
}
