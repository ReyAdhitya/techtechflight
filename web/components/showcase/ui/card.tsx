import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * shadcn's Card, re-skinned onto the showcase's glass surface.
 *
 * Kept as a primitive rather than inlined so every panel on the board — the 3D stage,
 * the Fleet summary, a Drone — shares one elevation, one radius and one specular edge.
 * The moment those drift, "glass" stops reading as a material and starts reading as
 * three unrelated boxes.
 */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('sc-glass', className)} {...props} />
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 p-5 pb-0', className)} {...props} />
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return (
    <h3
      className={cn('m-0 text-lg font-semibold tracking-[-0.01em]', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn('m-0 text-sm text-[var(--sc-ink-muted)]', className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex items-center gap-3 p-5 pt-0', className)} {...props} />
}
