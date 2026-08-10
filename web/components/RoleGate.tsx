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
import { checkTeacherPin, hasTeacherPin, isTeacherPinShape, setTeacherPin } from '@/lib/teacher-pin'
import { loadClassroomByCode, normalizeClassroomCode } from '@/lib/classroom-session'

/**
 * The door, and the two secrets behind it.
 *
 * One centred question, two identical boxes, one word in each. It used to be left aligned,
 * with two boxes of different colours and different weights and a line of small grey type
 * under each, which read as one recommended choice and one afterthought. There is no
 * recommended choice here: a device is a Teacher's or a child's, and the box that is not
 * yours should look exactly as available as the one that is.
 *
 * **A role is a secret, not a preference.** Tapping a box asks for the matching one:
 *
 * | Role | Secret | Who knows it |
 * |---|---|---|
 * | Student | the classroom code | everyone, the Teacher reads it out |
 * | Teacher | a four digit PIN | the Teacher alone, never spoken in the room |
 *
 * Before this, the door only remembered which box was tapped, and a **Switch role** button in
 * the header of every screen let anyone change their mind: two taps from a child to Land and
 * Stop. That button has left the Student chrome entirely and asks for the PIN on the Teacher
 * side.
 *
 * The type shrinks on a phone rather than the wording changing, and the two boxes stack and
 * stay identical. Same words on every device.
 */

type Door = { readonly step: 'choose' } | { readonly step: 'teacher' } | { readonly step: 'student' }

export function RoleGateScreen() {
  const router = useRouter()
  const [door, setDoor] = useState<Door>({ step: 'choose' })

  const enter = (role: BoardRole) => {
    writeBoardRole(role)
    router.replace(role === 'student' ? '/student' : '/mission')
  }

  if (door.step === 'teacher') {
    return <TeacherSecret onBack={() => setDoor({ step: 'choose' })} onIn={() => enter('teacher')} />
  }
  if (door.step === 'student') {
    return <StudentSecret onBack={() => setDoor({ step: 'choose' })} onIn={() => enter('student')} />
  }

  return (
    <DoorFrame ask="Who is using this device?">
      <div className="door__choices">
        <button type="button" className="door__choice" onClick={() => setDoor({ step: 'teacher' })}>
          Teacher
        </button>
        <button type="button" className="door__choice" onClick={() => setDoor({ step: 'student' })}>
          Student
        </button>
      </div>
    </DoorFrame>
  )
}

/**
 * The private half.
 *
 * On a board that has never had one, the door asks the Teacher to **choose** a PIN rather than
 * to prove one. Anything else locks a Teacher out of their own laptop on the first morning, and
 * letting them straight through with no PIN would leave the hole this exists to close.
 */
function TeacherSecret({
  onBack,
  onIn,
}: {
  readonly onBack: () => void
  readonly onIn: () => void
}) {
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)
  const [choosing, setChoosing] = useState(false)

  // Read after mount: the server render has no localStorage and must not disagree with the
  // first client paint.
  useEffect(() => setChoosing(!hasTeacherPin()), [])

  const answer = () => {
    if (!isTeacherPinShape(pin)) {
      setWrong(true)
      return
    }
    if (choosing) {
      if (!setTeacherPin(pin)) {
        setWrong(true)
        return
      }
      onIn()
      return
    }
    if (!checkTeacherPin(pin)) {
      setWrong(true)
      return
    }
    onIn()
  }

  return (
    <DoorFrame ask={choosing ? 'Choose a four digit PIN' : 'Teacher PIN'} onBack={onBack}>
      <SecretForm
        label={choosing ? 'Choose a four digit PIN' : 'Teacher PIN'}
        value={pin}
        onChange={(next) => {
          setPin(next.replace(/\D/g, '').slice(0, 4))
          setWrong(false)
        }}
        inputMode="numeric"
        placeholder="0000"
        ready={pin.length === 4}
        busy={false}
        onAnswer={answer}
        wrong={wrong ? (choosing ? 'Four digits, please.' : 'That is not the PIN.') : null}
      />
    </DoorFrame>
  )
}

/** The public half. Read out loud, typed by thirty children, and checked against a live room. */
function StudentSecret({
  onBack,
  onIn,
}: {
  readonly onBack: () => void
  readonly onIn: () => void
}) {
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const answer = () => {
    setBusy(true)
    setWrong(null)
    void loadClassroomByCode(code).then((session) => {
      setBusy(false)
      if (session === null) {
        setWrong('No classroom with that code yet. Ask your teacher.')
        return
      }
      onIn()
    })
  }

  return (
    <DoorFrame ask="Classroom code" onBack={onBack}>
      <SecretForm
        label="Classroom code"
        value={code}
        onChange={(next) => {
          setCode(normalizeClassroomCode(next))
          setWrong(null)
        }}
        inputMode="text"
        placeholder="4K9P"
        ready={code.length >= 4}
        busy={busy}
        onAnswer={answer}
        wrong={wrong}
      />
    </DoorFrame>
  )
}

/** One box, one word on the button. The same shape whichever secret is being asked for. */
function SecretForm({
  label,
  value,
  onChange,
  inputMode,
  placeholder,
  ready,
  busy,
  onAnswer,
  wrong,
}: {
  readonly label: string
  readonly value: string
  readonly onChange: (next: string) => void
  readonly inputMode: 'numeric' | 'text'
  readonly placeholder: string
  readonly ready: boolean
  readonly busy: boolean
  readonly onAnswer: () => void
  readonly wrong: string | null
}) {
  return (
    <form
      className="door__form"
      onSubmit={(event) => {
        event.preventDefault()
        if (ready && !busy) onAnswer()
      }}
    >
      <input
        // Autofocus is right at a door: there is one field and nothing else to do with it.
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        inputMode={inputMode}
        // Four is the shape of both secrets; six leaves room for a longer classroom code.
        maxLength={6}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-label={label}
        placeholder={placeholder}
        className="door__secret tnum"
      />
      <button type="submit" disabled={!ready || busy} className="door__choice door__choice--go">
        {busy ? 'Checking' : 'Enter'}
      </button>
      {wrong === null ? null : (
        <p role="alert" className="m-0 text-body text-status-not-ready">
          {wrong}
        </p>
      )}
    </form>
  )
}

/**
 * Equal space above and below, and one line across the middle.
 *
 * The frame is a three-row grid rather than a centred column so the question sits on the same
 * line whichever step is up: a door whose heading jumped between the two steps would read as
 * two different screens.
 */
function DoorFrame({
  ask,
  children,
  onBack,
}: {
  readonly ask: string
  readonly children: ReactNode
  readonly onBack?: () => void
}) {
  return (
    <main id="content" tabIndex={-1} className="door">
      <div className="door__middle">
        <h1 className="door__ask">{ask}</h1>
        {children}
        {onBack === undefined ? null : (
          <button type="button" onClick={onBack} className="door__back">
            Back
          </button>
        )}
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
