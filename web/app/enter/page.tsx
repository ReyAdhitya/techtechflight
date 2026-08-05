'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGateScreen } from '@/components/RoleGate'
import { readBoardRole } from '@/lib/role'

export default function EnterPage() {
  const router = useRouter()

  useEffect(() => {
    const role = readBoardRole()
    if (role === 'teacher') router.replace('/lesson')
    if (role === 'student') router.replace('/student')
  }, [router])

  return <RoleGateScreen />
}
