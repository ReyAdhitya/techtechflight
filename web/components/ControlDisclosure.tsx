'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A compact disclosure so Control extras do not shove the Scope and strips down the page.
 * Closed by default — open only when the Teacher asks.
 */
export function ControlDisclosure({
  summary,
  count,
  children,
  className,
}: {
  readonly summary: string
  readonly count?: number
  readonly children: ReactNode
  readonly className?: string
}) {
  return (
    <details
      className={cn(
        'rounded-surface border border-hairline bg-surface-1 open:pb-3',
        '[&[open]>summary>span:first-child]:rotate-90',
        className,
      )}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-display text-body font-medium text-ink marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-ink-muted transition-transform" aria-hidden="true">
          ▸
        </span>
        <span>{summary}</span>
        {count !== undefined && (
          <span className="tnum label rounded-pill border border-hairline px-2 py-0.5 text-ink-subtle">
            {count}
          </span>
        )}
      </summary>
      <div className="flex flex-col gap-3 border-t border-hairline px-4 pt-3">{children}</div>
    </details>
  )
}
