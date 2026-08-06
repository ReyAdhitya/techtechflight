'use client'

import { useRouter } from 'next/navigation'
import { clearBoardRole } from '@/lib/role'
import { cn } from '@/lib/utils'

/**
 * Leave Teacher or Student chrome and go back to the door.
 *
 * Role is sticky in localStorage so a returning device skips `/enter`; this is how you
 * reverse that without clearing site data.
 */
export function SwitchRoleButton({
  className,
  label = 'Switch role',
}: {
  readonly className?: string
  readonly label?: string
}) {
  const router = useRouter()

  return (
    <button
      type="button"
      className={cn(
        'min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-subtle hover:border-ink hover:text-ink',
        className,
      )}
      onClick={() => {
        clearBoardRole()
        router.replace('/enter')
      }}
    >
      {label}
    </button>
  )
}
