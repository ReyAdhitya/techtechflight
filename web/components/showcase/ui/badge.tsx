import type { ComponentProps } from 'react'
import type { Status } from '@techtechflight/contract'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { cn } from '@/lib/utils'

export interface BadgeProps extends ComponentProps<'span'> {
  readonly status: Status
}

/**
 * shadcn's Badge, carrying a Status.
 *
 * Three redundant channels, exactly as the restrained board has: the word, a shape, and
 * a colour. The showcase spends far more colour than the board it is being compared
 * with, but dropping the word or the shape would be losing the comparison on a point it
 * does not need to lose — a projector washes out hue long before it washes out a square.
 */
export function Badge({ status, className, ...props }: BadgeProps) {
  const presentation = STATUS_PRESENTATION[status]

  return (
    <span data-status={status} className={cn('sc-chip', className)} {...props}>
      <span className="sc-chip__glyph" data-shape={presentation.shape} aria-hidden="true" />
      {presentation.label}
    </span>
  )
}
