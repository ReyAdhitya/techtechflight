import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const button = cva('sc-button', {
  variants: {
    variant: {
      outline: '',
      solid: '',
      ghost: '',
    },
    size: {
      default: '',
      sm: 'min-h-8 px-3 text-[0.8125rem]',
      icon: 'min-h-9 w-9 px-0',
    },
  },
  defaultVariants: { variant: 'outline', size: 'default' },
})

export interface ButtonProps
  extends ComponentProps<'button'>,
    VariantProps<typeof button> {
  /** shadcn's escape hatch: render the child element with these styles instead. */
  readonly asChild?: boolean
}

/**
 * shadcn's Button — cva variants, a `data-` driven skin, and Radix Slot for `asChild`.
 *
 * `type="button"` by default for the same reason the restrained board does it: nothing
 * on a status board belongs to a form, and one stray submit is worse than saying so in
 * a single place. It is omitted when the button is standing in for something else, so
 * an anchor never carries an attribute that means nothing on an anchor.
 */
export function Button({
  className,
  variant,
  size,
  type,
  asChild = false,
  ...props
}: ButtonProps) {
  const Root = asChild ? Slot : 'button'

  return (
    <Root
      {...(asChild ? {} : { type: type ?? 'button' })}
      data-variant={variant ?? 'outline'}
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  )
}
