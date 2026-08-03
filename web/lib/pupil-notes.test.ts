import { beforeEach, describe, expect, it } from 'vitest'
import {
  PUPIL_NOTES_KEY,
  clearPupilNotes,
  pupilNoteOf,
  readPupilNotes,
  writePupilNote,
} from './pupil-notes'

beforeEach(() => {
  clearPupilNotes()
})

describe('pupil notes', () => {
  it('stores free text against a StudentRecord id, mirroring craft notes', () => {
    writePupilNote('S-0001', '  Needs a longer hover warm-up  ', 1_000)
    expect(pupilNoteOf(readPupilNotes(), 'S-0001')).toEqual({
      text: 'Needs a longer hover warm-up',
      updatedAt: 1_000,
    })
    expect(window.localStorage.getItem(PUPIL_NOTES_KEY)).toContain('S-0001')
  })

  it('clears the row when the Teacher empties the field', () => {
    writePupilNote('S-0001', 'Keep an eye on landings', 1_000)
    writePupilNote('S-0001', '   ', 2_000)
    expect(pupilNoteOf(readPupilNotes(), 'S-0001')).toBeNull()
    expect(readPupilNotes()).toEqual({})
  })

  it('ignores a blank studentId rather than writing a nameless row', () => {
    writePupilNote('  ', 'orphan', 1_000)
    expect(readPupilNotes()).toEqual({})
  })

  it('keeps notes for different Students apart', () => {
    writePupilNote('S-0001', 'Amara', 1)
    writePupilNote('S-0002', 'Priya', 2)
    expect(pupilNoteOf(readPupilNotes(), 'S-0001')?.text).toBe('Amara')
    expect(pupilNoteOf(readPupilNotes(), 'S-0002')?.text).toBe('Priya')
  })
})
