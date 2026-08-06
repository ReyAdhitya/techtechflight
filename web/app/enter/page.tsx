'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGateScreen } from '@/components/RoleGate'
import { readBoardRole } from '@/lib/role'

/**
 * The door. If this device already chose Teacher or Student, skip straight in.
 */
export default function EnterPage() {
  const router = useRouter()
  const [showDoor, setShowDoor] = useState(false)

  useEffect(() => {
    const role = readBoardRole()
    if (role === 'teacher') {
      router.replace('/lesson')
      return
    }
    if (role === 'student') {
      router.replace('/student')
      return
    }
    setShowDoor(true)
  }, [router])

  if (!showDoor) {
    return (
      <main id="content" tabIndex={-1} className="flex min-h-[100dvh] items-center p-8">
        <p className="m-0 text-body text-ink-muted">Opening…</p>
      </main>
    )
  }

  return <RoleGateScreen />
}
