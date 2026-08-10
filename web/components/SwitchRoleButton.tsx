'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clearBoardRole } from '@/lib/role'
import { checkTeacherPin, isTeacherPinShape } from '@/lib/teacher-pin'
import { writeStudentSeatLocal } from '@/lib/classroom-session'
import { cn } from '@/lib/utils'

/**
 * Leave the Teacher board and go back to the door. **Teacher chrome only.**
 *
 * It used to sit in the header of every screen including a Student's, which was two taps from
 * a child to Land and Stop, and the most serious of the eight things found on a tablet. It is
 * gone from the Student app entirely: a child leaves by closing the lid.
 *
 * On this side it asks for the PIN. A Teacher proving who they are to leave their own board
 * looks like ceremony until you picture the laptop unattended on the desk at break: the answer
 * to "who is using this device" is the one setting on the machine that a child must not be
 * able to change.
 *
 * Clearing the Student seat stops a tablet from staying "seated" after someone switches away.
 */
export function SwitchRoleButton({
  className,
  label = 'Switch role',
}: {
  readonly className?: string
  readonly label?: string
}) {
  const router = useRouter()
  const [asking, setAsking] = useState(false)
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)

  const leave = () => {
    writeStudentSeatLocal(null)
    clearBoardRole()
    router.replace('/enter')
  }

  if (!asking) {
    return (
      <button
        type="button"
        className={cn(
          'min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-subtle hover:border-ink hover:text-ink',
          className,
        )}
        onClick={() => {
          setPin('')
          setWrong(false)
          setAsking(true)
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (!isTeacherPinShape(pin) || !checkTeacherPin(pin)) {
          setWrong(true)
          return
        }
        leave()
      }}
    >
      <input
        autoFocus
        value={pin}
        onChange={(event) => {
          setPin(event.target.value.replace(/\D/g, '').slice(0, 4))
          setWrong(false)
        }}
        inputMode="numeric"
        maxLength={4}
        autoComplete="off"
        aria-label="Teacher PIN"
        placeholder="PIN"
        className="tnum min-h-11 w-24 rounded-pill border border-hairline bg-canvas px-3 text-center text-value tracking-[0.3em] text-ink"
      />
      <button
        type="submit"
        className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
      >
        {label}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className="min-h-11 cursor-pointer rounded-pill border-0 bg-transparent px-2 text-value text-ink-muted hover:text-ink"
      >
        Cancel
      </button>
      {wrong ? (
        <span role="alert" className="text-value text-status-not-ready">
          That is not the PIN.
        </span>
      ) : null}
    </form>
  )
}
