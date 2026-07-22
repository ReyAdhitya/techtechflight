import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/** shadcn's Skeleton. Shimmer stops under `prefers-reduced-motion` (see showcase.css). */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('sc-skeleton', className)} aria-hidden="true" {...props} />
}
