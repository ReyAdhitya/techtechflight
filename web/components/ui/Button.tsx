import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * The pill is the one place ADR-0004 keeps the source system's 100px radius: board
 * surfaces are 4px, buttons are pills, and the contrast between the two is what marks a
 * button as the thing you press.
 */
const VARIANTS = {
  /* Reads as a control without competing with the Drone it sits under. */
  quiet:
    'border border-hairline text-ink-muted hover:text-ink hover:border-ink-subtle',
  /* The way out of a sub-screen. Filled, so it is unmissable at a glance. */
  primary: 'bg-ink text-canvas hover:bg-ink-subtle border border-transparent',
} as const

export interface ButtonProps extends ComponentProps<'button'> {
  readonly variant?: keyof typeof VARIANTS
}

export function Button({ variant = 'quiet', className, type, ...props }: ButtonProps) {
  return (
    <button
      // Buttons on a board are never inside a form, and a stray submit is worse than
      // the verbosity of saying so at every call site once, here.
      type={type ?? 'button'}
      className={cn(
        'inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-pill px-4',
        'text-value font-medium whitespace-nowrap transition-colors',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
