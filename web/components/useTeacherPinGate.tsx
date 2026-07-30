'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { isTeacherPinUnlocked } from '@/lib/teacher-pin'
import { TeacherPinOverlay } from './TeacherPinOverlay'

function subscribe(onStoreChange: () => void) {
  window.addEventListener('teacher-pin-change', onStoreChange)
  return () => window.removeEventListener('teacher-pin-change', onStoreChange)
}

/**
 * Session PIN gate — call `ensureUnlocked` before sensitive actions; render `overlay`
 * when the screen must stay blocked (Settings).
 */
export function useTeacherPinGate() {
  const unlocked = useSyncExternalStore(subscribe, isTeacherPinUnlocked, () => false)
  const [pending, setPending] = useState<(() => void) | null>(null)
  const [promptOpen, setPromptOpen] = useState(false)

  const onUnlocked = useCallback(() => {
    window.dispatchEvent(new Event('teacher-pin-change'))
    setPromptOpen(false)
    const action = pending
    setPending(null)
    action?.()
  }, [pending])

  const ensureUnlocked = useCallback((action: () => void) => {
    if (isTeacherPinUnlocked()) {
      action()
      return
    }
    setPending(() => action)
    setPromptOpen(true)
  }, [])

  const overlay = promptOpen ? <TeacherPinOverlay onUnlocked={onUnlocked} /> : null

  return { unlocked, ensureUnlocked, overlay }
}
