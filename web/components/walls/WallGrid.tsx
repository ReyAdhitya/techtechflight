import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Responsive tile grid for Classroom Walls.
 *
 * Semantic surface only — no card chrome beyond a hairline. Sub-walls own tile contents.
 */
export function WallGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <ul
      className={cn(
        'm-0 grid list-none grid-cols-1 gap-3 p-0 min-[30rem]:grid-cols-2 min-[56rem]:grid-cols-3 min-[80rem]:grid-cols-4',
        className,
      )}
    >
      {children}
    </ul>
  )
}

export function WallTile({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <li
      className={cn(
        'flex min-h-[6rem] flex-col gap-2 rounded-sm border border-hairline bg-surface-1 p-3 text-ink',
        className,
      )}
    >
      {children}
    </li>
  )
}
