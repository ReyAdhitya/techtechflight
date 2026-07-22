'use client'

import type { ReactNode } from 'react'
import * as HoverCardPrimitive from '@radix-ui/react-hover-card'

export interface HoverCardProps {
  readonly children: ReactNode
  readonly content: ReactNode
  readonly side?: 'top' | 'right' | 'bottom' | 'left'
}

/**
 * shadcn's Hover Card.
 *
 * Used for exactly one thing on this board: the Last Contact line, where a Teacher may
 * want the exact moment and the age side by side without opening the Drone. Hover Card
 * is the right primitive for content you might want to read rather than glance at —
 * it has a grace area and does not vanish when the pointer crosses the gap.
 *
 * It is not, and cannot be, the only route to that content: it is unreachable by touch
 * and by keyboard, so everything in here is also in the Drone's own panel.
 */
export function HoverCard({ children, content, side = 'top' }: HoverCardProps) {
  return (
    <HoverCardPrimitive.Root openDelay={180} closeDelay={120}>
      <HoverCardPrimitive.Trigger asChild>{children}</HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content className="sc-popover" side={side} sideOffset={8}>
          {content}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  )
}
