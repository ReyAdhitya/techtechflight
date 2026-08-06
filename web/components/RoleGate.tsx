'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  BOARD_ROLE_EVENT,
  BOARD_ROLE_KEY,
  readBoardRole,
  writeBoardRole,
  type BoardRole,
} from '@/lib/role'

/**
 * The door. Teacher board or Student Mission tablet, side by side.
 */

export function RoleGateScreen() {
  const router = useRouter()
  const choose = (role: BoardRole) => {
    writeBoardRole(role)
    router.replace(role === 'student' ? '/student' : '/lesson')
  }

  return (
    <main
      id="content"
      tabIndex={-1}
      className="flex min-h-[100dvh] w-full flex-col justify-center gap-8 p-6 min-[48rem]:p-10"
    >
      <div className="flex flex-col gap-2">
        <p className="label m-0 text-ink-subtle">TechTech Flight Deck</p>
        <h1 className="m-0 font-display text-heading font-medium text-balance">
          Who is using this device?
        </h1>
        <p className="m-0 max-w-[50ch] text-body text-ink-muted">
          Teachers run the lesson on this board. Students join on an iPad with the classroom
          code, then fly by hand with a controller.
        </p>
      </div>

      <div className="grid w-full max-w-[56rem] grid-cols-1 gap-3 min-[40rem]:grid-cols-2">
        <button
          type="button"
          onClick={() => choose('teacher')}
          className="min-h-28 cursor-pointer rounded-surface border-0 bg-ink px-5 py-5 text-left text-body font-medium text-canvas"
        >
          I am the Teacher
          <span className="mt-2 block text-value font-normal text-canvas/80">
            Lesson, Control, Fleet, clearances
          </span>
        </button>
        <button
          type="button"
          onClick={() => choose('student')}
          className="min-h-28 cursor-pointer rounded-surface border border-hairline bg-surface-1 px-5 py-5 text-left text-body font-medium text-ink"
        >
          I am a Student
          <span className="mt-2 block text-value font-normal text-ink-subtle">
            Join with the classroom code on this iPad
          </span>
        </button>
      </div>
    </main>
  )
}

function Opening() {
  return (
    <main id="content" tabIndex={-1} className="p-8">
      <p className="m-0 text-body text-ink-muted">Opening…</p>
    </main>
  )
}

/**
 * Teacher chrome never mounts for a Student device, and the reverse.
 *
 * Role is read on the client before children render (not only in an effect), so a Student
 * who types `/lesson` or `/control` never sees Teacher UI. Wrong role always redirects.
 */
export function RequireRole({
  role,
  children,
}: {
  readonly role: BoardRole
  readonly children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const current = readBoardRole()
    if (current === null) {
      router.replace('/enter')
      return
    }
    if (current !== role) {
      // Student devices stay on /student. Teacher devices stay in Teacher chrome.
      router.replace(current === 'student' ? '/student' : '/lesson')
    }
  }, [role, router, pathname, generation])

  useEffect(() => {
    const bump = () => setGeneration((n) => n + 1)
    const onStorage = (event: StorageEvent) => {
      if (event.key === BOARD_ROLE_KEY || event.key === null) bump()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(BOARD_ROLE_EVENT, bump)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(BOARD_ROLE_EVENT, bump)
    }
  }, [])

  if (typeof window === 'undefined') return <Opening />

  const current = readBoardRole()
  if (current !== role) return <Opening />

  return <>{children}</>
}
