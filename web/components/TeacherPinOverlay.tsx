'use client'

import { useEffect, useRef, useState } from 'react'
import { unlockTeacherPin } from '@/lib/teacher-pin'

/**
 * Blocks sensitive Control and Settings until the demo teacher PIN is entered.
 */
export function TeacherPinOverlay({ onUnlocked }: { onUnlocked: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = () => {
    if (unlockTeacherPin(pin)) {
      setError(false)
      onUnlocked()
      return
    }
    setError(true)
    setPin('')
    inputRef.current?.focus()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-labelledby="teacher-pin-title"
    >
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-surface border border-hairline bg-canvas p-6">
        <h2 id="teacher-pin-title" className="m-0 font-display text-summary font-medium text-ink">
          Teacher PIN
        </h2>
        <p className="m-0 text-body text-ink-subtle">
          Enter the teacher PIN to command Drones or change Settings. Demo PIN only — not
          security.
        </p>
        <label className="flex flex-col gap-1">
          <span className="label">PIN</span>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value)
              setError(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit()
            }}
            className="min-h-11 rounded-surface border border-hairline bg-surface-1 px-3 py-2 text-value text-ink"
          />
        </label>
        {error && <p className="m-0 text-value text-status-fault">Wrong PIN — try again.</p>}
        <button
          type="button"
          onClick={submit}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Unlock
        </button>
      </div>
    </div>
  )
}
