'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CameraWall } from '@/components/walls/CameraWall'
import { StatusWall } from '@/components/walls/StatusWall'
import { cn } from '@/lib/utils'

/**
 * Walls TV mode — fullscreen-ish Cameras or Status, no Settings chrome.
 * SiteHeader still exists via layout; this page hides the usual Walls back-link clutter.
 */
export function WallsTvMode() {
  const [mode, setMode] = useState<'cameras' | 'status'>('cameras')

  return (
    <main
      id="content"
      tabIndex={-1}
      className="mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col gap-4 p-4 min-[26rem]:p-6"
    >
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-display text-summary font-medium text-ink">TV</h1>
        <div className="flex gap-2" role="group" aria-label="TV wall">
          <button
            type="button"
            aria-pressed={mode === 'cameras'}
            onClick={() => setMode('cameras')}
            className={cn(
              'min-h-11 rounded-pill border px-3 py-1.5 text-caption',
              mode === 'cameras'
                ? 'border-ink bg-surface-1 text-ink'
                : 'border-hairline text-ink-subtle',
            )}
          >
            Cameras
          </button>
          <button
            type="button"
            aria-pressed={mode === 'status'}
            onClick={() => setMode('status')}
            className={cn(
              'min-h-11 rounded-pill border px-3 py-1.5 text-caption',
              mode === 'status'
                ? 'border-ink bg-surface-1 text-ink'
                : 'border-hairline text-ink-subtle',
            )}
          >
            Status
          </button>
        </div>
        <Link
          href="/walls"
          prefetch={false}
          className="ml-auto text-caption text-ink-subtle underline-offset-4 hover:underline"
        >
          Exit TV
        </Link>
      </header>
      {mode === 'cameras' ? <CameraWall /> : <StatusWall />}
    </main>
  )
}
