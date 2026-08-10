/**
 * The Teacher's four digit PIN — the private half of the pair that tells the roles apart.
 *
 * The two secrets are deliberately asymmetric. The **classroom code** is public: the Teacher
 * reads it out, thirty children type it, and that is the whole point of it. The **PIN** is
 * private: the Teacher sets it once and never says it in the room. A door that asks for the
 * matching secret is what stops a child two taps from Land and Stop.
 *
 * ## What the stored digest is worth, exactly
 *
 * Four digits behind a non-cryptographic hash in `localStorage`. That defeats a glance at the
 * Application tab and nothing else: ten thousand candidates is a second's work for anyone who
 * can open a console, and the digest is not salted per install because there is nowhere to put
 * a salt that the same attacker could not read.
 *
 * It is sized for the actual threat, which is a curious ten year old holding an iPad, not a
 * determined one holding a laptop. The measure for that child is **iPad Guided Access**, which
 * is a device lock rather than a page lock and is the one thing they genuinely cannot defeat.
 * Settings says so in those words. Do not upgrade this to SubtleCrypto and imagine it now
 * protects something: the honest fix is the device, not the digest.
 */

export const TEACHER_PIN_KEY = 'techtechflight:teacher-pin'
/** Same-tab signal — `storage` only fires across tabs. */
export const TEACHER_PIN_EVENT = 'techtechflight:teacher-pin'

/** Four digits. Short enough to type on a tablet while a class waits. */
export function isTeacherPinShape(pin: string): boolean {
  return /^\d{4}$/.test(pin.trim())
}

/** FNV-1a over the digits. See the note above for what this is and is not. */
function digest(pin: string): string {
  let hash = 0x811c9dc5
  for (const character of `ttf:${pin.trim()}`) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

function notifyTeacherPinChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(TEACHER_PIN_EVENT))
}

export function readTeacherPinDigest(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TEACHER_PIN_KEY)
    return raw && raw.trim() !== '' ? raw : null
  } catch {
    return null
  }
}

/** Whether this browser has a PIN yet. False on the first morning, and the door says so. */
export function hasTeacherPin(): boolean {
  return readTeacherPinDigest() !== null
}

/** Set or change the PIN. Refuses anything that is not four digits. */
export function setTeacherPin(pin: string): boolean {
  if (!isTeacherPinShape(pin)) return false
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(TEACHER_PIN_KEY, digest(pin))
  } catch {
    return false
  }
  notifyTeacherPinChanged()
  return true
}

/**
 * Does this PIN open the board.
 *
 * **True when no PIN has been set**, because a board with no PIN has no lock, and a door that
 * refused every answer on the first morning would lock the Teacher out of their own laptop.
 * The door handles that case by asking them to choose one instead of asking them to prove one.
 */
export function checkTeacherPin(pin: string): boolean {
  const stored = readTeacherPinDigest()
  if (stored === null) return true
  return digest(pin) === stored
}

export function clearTeacherPin(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(TEACHER_PIN_KEY)
  } catch {
    /* ignore */
  }
  notifyTeacherPinChanged()
}

export function subscribeTeacherPin(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key === TEACHER_PIN_KEY || event.key === null) onChange()
  }
  window.addEventListener('storage', onStorage)
  window.addEventListener(TEACHER_PIN_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener(TEACHER_PIN_EVENT, onChange)
  }
}
