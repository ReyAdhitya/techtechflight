'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGateScreen } from '@/components/RoleGate'
import { readBoardRole, type BoardRole } from '@/lib/role'

/**
 * The door. If this device already chose Teacher or Student, skip straight in.
 *
 * Do not leave the page stuck on "Opening…" when there is no role: that was the bug.
 * Read localStorage after mount, then either redirect or show the two choices.
 */
export default function EnterPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'loading' | 'door' | 'redirecting'>('loading')

  useEffect(() => {
    const role: BoardRole | null = readBoardRole()
    if (role === 'teacher') {
      setPhase('redirecting')
      router.replace('/lesson')
      return
    }
    if (role === 'student') {
      setPhase('redirecting')
      router.replace('/student')
      return
    }
    setPhase('door')
  }, [router])

  if (phase === 'door') {
    return <RoleGateScreen />
  }

  return (
    <main id="content" tabIndex={-1} className="flex min-h-[100dvh] items-center p-8">
      <p className="m-0 text-body text-ink-muted">Opening…</p>
    </main>
  )
}
