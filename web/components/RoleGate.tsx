'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { readBoardRole, writeBoardRole, type BoardRole } from '@/lib/role'

/**
 * The door. Teacher board or Student Mission phone (#627).
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
      /* Full width. A Student meets this door on the same tablet they fly from, and a
         phone-width column in the middle of a landscape screen is the fault that got the
         first Student screen rejected. */
      className="flex min-h-[100dvh] w-full flex-col justify-center gap-8 p-6 min-[48rem]:p-10"
    >
      <div className="flex flex-col gap-2">
        <p className="label m-0 text-ink-subtle">TechTech Flight Deck</p>
        <h1 className="m-0 font-display text-heading font-medium text-balance">
          Who is using this device?
        </h1>
        <p className="m-0 text-body text-ink-muted">
          Teachers run the lesson on this board. Students join on an iPad with the classroom
          code, then fly by hand with a controller.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => choose('teacher')}
          className="min-h-14 cursor-pointer rounded-surface border-0 bg-ink px-5 py-4 text-left text-body font-medium text-canvas"
        >
          I am the Teacher
          <span className="mt-1 block text-value font-normal text-canvas/80">
            Lesson, Control, Fleet, clearances
          </span>
        </button>
        <button
          type="button"
          onClick={() => choose('student')}
          className="min-h-14 cursor-pointer rounded-surface border border-hairline bg-surface-1 px-5 py-4 text-left text-body font-medium text-ink"
        >
          I am a Student
          <span className="mt-1 block text-value font-normal text-ink-subtle">
            Join with the classroom code on this iPad
          </span>
        </button>
      </div>
    </main>
  )
}

/** Redirect Teacher chrome away from Students, and the reverse. */
export function RequireRole({
  role,
  children,
}: {
  readonly role: BoardRole
  readonly children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const current = readBoardRole()
    if (current === null) {
      router.replace('/enter')
      return
    }
    if (current !== role) {
      router.replace(current === 'student' ? '/student' : '/lesson')
      return
    }
    setReady(true)
  }, [role, router, pathname])

  if (!ready) {
    return (
      <main id="content" tabIndex={-1} className="p-8">
        <p className="m-0 text-body text-ink-muted">Opening…</p>
      </main>
    )
  }

  return <>{children}</>
}
