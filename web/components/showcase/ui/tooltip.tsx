'use client'

import type { ReactNode } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export const TooltipProvider = TooltipPrimitive.Provider

export interface TooltipProps {
  readonly children: ReactNode
  readonly content: ReactNode
  readonly side?: 'top' | 'right' | 'bottom' | 'left'
}

/** shadcn's Tooltip. Trigger is `asChild`, so the caller keeps its own semantics. */
export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content className="sc-tooltip" side={side} sideOffset={6}>
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
