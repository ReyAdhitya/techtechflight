'use client'

import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  readBoardRole,
  readServerBoardRole,
  subscribeBoardRole,
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
 *
 * The read goes through `useSyncExternalStore` rather than calling `readBoardRole()` in the
 * render body. Reading `localStorage` while rendering made the exported HTML (which has no
 * device to read, so it showed the door) disagree with the browser's very first render
 * (which had a role, so it showed the whole board). That is a hydration mismatch: React
 * threw error #418 on every page load in production and rebuilt the entire tree client-side.
 * The server snapshot keeps both sides on `Opening`, and the device's real role lands on the
 * commit straight after, still before anything is painted.
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
  const current = useSyncExternalStore(subscribeBoardRole, readBoardRole, readServerBoardRole)

  useEffect(() => {
    /*
     * Read again rather than trusting `current`: on the hydrating commit that is still the
     * server's null, and redirecting on it would send a legitimate Teacher back to the door.
     * Inside an effect the device is always there to ask.
     */
    const actual = readBoardRole()
    if (actual === null) {
      router.replace('/enter')
      return
    }
    if (actual !== role) {
      // Student devices stay on /student. Teacher devices stay in Teacher chrome.
      router.replace(actual === 'student' ? '/student' : '/lesson')
    }
  }, [role, router, pathname, current])

  if (current !== role) return <Opening />

  return <>{children}</>
}
