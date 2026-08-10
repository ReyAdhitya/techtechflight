'use client'

import { useEffect, useState } from 'react'
import {
  checkTeacherPin,
  hasTeacherPin,
  isTeacherPinShape,
  setTeacherPin,
  subscribeTeacherPin,
} from '@/lib/teacher-pin'
import { SwitchRoleButton } from './SwitchRoleButton'

/**
 * The Teacher's PIN, and the lock that is stronger than it.
 *
 * Two secrets tell the roles apart, and they are asymmetric on purpose: the classroom code is
 * public because thirty children have to type it, and the PIN is private because it is the
 * only thing standing between a curious child and Land, Hover, Recall and Stop.
 *
 * The Guided Access paragraph is here because it is the honest recommendation. A four digit
 * PIN in a browser is a page lock; Guided Access is a device lock, it needs no code from us,
 * and it is the only measure a determined ten year old cannot get round. It also keeps a class
 * out of Safari and YouTube for the hour, which is the reason a Teacher will actually turn it
 * on.
 */
export function TeacherPinPanel() {
  const [set, setSet] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [said, setSaid] = useState<string | null>(null)
  const [wrong, setWrong] = useState<string | null>(null)

  // Read after mount: the server render has no localStorage.
  useEffect(() => {
    const read = () => setSet(hasTeacherPin())
    read()
    return subscribeTeacherPin(read)
  }, [])

  const save = () => {
    setSaid(null)
    setWrong(null)
    if (set && !checkTeacherPin(current)) {
      setWrong('That is not the current PIN.')
      return
    }
    if (!isTeacherPinShape(next)) {
      setWrong('A PIN is four digits.')
      return
    }
    if (!setTeacherPin(next)) {
      setWrong('This browser would not save it.')
      return
    }
    setCurrent('')
    setNext('')
    setSaid('Saved. The door asks for it from now on.')
  }

  return (
    <section className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5">
      <div className="flex flex-col gap-1">
        <h2 className="label m-0">Teacher PIN</h2>
        <p className="m-0 text-value text-ink-subtle">
          {set
            ? 'Set on this device. The door asks for it before it shows the board.'
            : 'Not set on this device yet. The door asks the first Teacher through to choose one.'}
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        {set ? (
          <label className="flex flex-col gap-1">
            <span className="label">Current PIN</span>
            <input
              value={current}
              onChange={(event) => setCurrent(event.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              className="tnum min-h-11 w-28 rounded-pill border border-hairline bg-canvas px-3 text-center text-value tracking-[0.3em] text-ink"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1">
          <span className="label">{set ? 'New PIN' : 'Choose a PIN'}</span>
          <input
            value={next}
            onChange={(event) => setNext(event.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            className="tnum min-h-11 w-28 rounded-pill border border-hairline bg-canvas px-3 text-center text-value tracking-[0.3em] text-ink"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
        >
          Save PIN
        </button>
      </form>

      {wrong === null ? null : (
        <p role="alert" className="m-0 text-value text-status-not-ready">
          {wrong}
        </p>
      )}
      {said === null ? null : (
        <p role="status" className="m-0 text-value text-ink-subtle">
          {said}
        </p>
      )}

      <div className="flex flex-col gap-1 border-t border-hairline pt-4">
        <h3 className="label m-0">The stronger lock is on the iPad</h3>
        <p className="m-0 max-w-[60ch] text-value text-ink-subtle">
          Guided Access locks a tablet to this one page until you type the device passcode. It
          is the only measure a curious child cannot get round, and it keeps the class out of
          Safari for the hour. Turn it on in the iPad Settings, under Accessibility, then
          Guided Access. On the tablet, open this app and triple click the side button to
          start it.
        </p>
      </div>

      <div className="flex flex-col gap-2 border-t border-hairline pt-4">
        <h3 className="label m-0">Leave the board</h3>
        <p className="m-0 text-value text-ink-subtle">
          Go back to the door to pick Teacher or Student again. It asks for the PIN.
        </p>
        <SwitchRoleButton label="Switch Teacher or Student" />
      </div>
    </section>
  )
}
