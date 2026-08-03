/**
 * Free-text notes per Student — mirrors craft notes (`writeNote`) (#342 / F223).
 *
 * Craft notes live on `Logbook.notes`. Parallel wave tickets cannot extend that
 * shape without colliding, so pupil notes use a side localStorage key. Same
 * behaviour: trim on save, empty text deletes the row, `updatedAt` is when the
 * Teacher last left the field. Local first; never Telemetry (ADR-0015).
 */

export const PUPIL_NOTES_KEY = 'techtechflight:pupil-notes'

export interface PupilNote {
  readonly text: string
  readonly updatedAt: number
}

export type PupilNotesMap = Readonly<Record<string, PupilNote>>

const listeners = new Set<() => void>()
let cache: PupilNotesMap | null = null
let cacheIsFresh = false

function notify(): void {
  cacheIsFresh = false
  cache = null
  for (const listener of listeners) listener()
}

export function subscribePupilNotes(onChange: () => void): () => void {
  listeners.add(onChange)
  if (typeof window === 'undefined') return () => listeners.delete(onChange)
  const onStorage = (event: StorageEvent) => {
    if (event.key === PUPIL_NOTES_KEY) notify()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function readPupilNotes(): PupilNotesMap {
  if (cacheIsFresh && cache !== null) return cache
  cache = load()
  cacheIsFresh = true
  return cache
}

export function readServerPupilNotes(): PupilNotesMap {
  return {}
}

function load(): PupilNotesMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(PUPIL_NOTES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const next: Record<string, PupilNote> = {}
    for (const [studentId, value] of Object.entries(parsed)) {
      if (studentId.trim() === '') continue
      if (value === null || typeof value !== 'object') continue
      const row = value as Partial<PupilNote>
      if (typeof row.text !== 'string') continue
      if (typeof row.updatedAt !== 'number' || !Number.isFinite(row.updatedAt)) continue
      const text = row.text.trim()
      if (text === '') continue
      next[studentId] = { text, updatedAt: row.updatedAt }
    }
    return next
  } catch {
    return {}
  }
}

function persist(notes: PupilNotesMap): void {
  cache = notes
  cacheIsFresh = true
  if (typeof window === 'undefined') {
    for (const listener of listeners) listener()
    return
  }
  try {
    window.localStorage.setItem(PUPIL_NOTES_KEY, JSON.stringify(notes))
  } catch {
    /* memory only */
  }
  for (const listener of listeners) listener()
}

export function pupilNoteOf(notes: PupilNotesMap, studentId: string): PupilNote | null {
  return notes[studentId] ?? null
}

/**
 * Save or clear a Student note — same contract as `writeNote` for craft.
 *
 * Empty / whitespace-only text removes the row so the map stays sparse.
 */
export function writePupilNote(studentId: string, text: string, at: number): void {
  const id = studentId.trim()
  if (id === '') return
  const notes = { ...readPupilNotes() }
  const trimmed = text.trim()
  if (trimmed === '') delete notes[id]
  else notes[id] = { text: trimmed, updatedAt: at }
  persist(notes)
}

/** Test helper — clears pupil notes without touching the Logbook. */
export function clearPupilNotes(): void {
  cache = {}
  cacheIsFresh = true
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(PUPIL_NOTES_KEY)
    } catch {
      /* ignore */
    }
  }
  for (const listener of listeners) listener()
}
