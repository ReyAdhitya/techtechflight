import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { clearPupilNotes, pupilNoteOf, readPupilNotes } from '@/lib/pupil-notes'
import { PupilNotesField } from './PupilNotesField'

beforeEach(() => {
  clearPupilNotes()
})

describe('PupilNotesField', () => {
  it('saves the note when focus leaves the field', () => {
    render(
      <PupilNotesField studentId="S-0001" studentName="Amara" text="" />,
    )
    const field = screen.getByLabelText('Note for Amara')
    fireEvent.change(field, { target: { value: 'Longer hover next lesson' } })
    fireEvent.blur(field)
    expect(pupilNoteOf(readPupilNotes(), 'S-0001')?.text).toBe('Longer hover next lesson')
  })

  it('shows the stored text and clears it when emptied', () => {
    render(
      <PupilNotesField
        studentId="S-0002"
        studentName="Priya"
        text="Was absent last week"
      />,
    )
    const field = screen.getByLabelText('Note for Priya') as HTMLTextAreaElement
    expect(field.value).toBe('Was absent last week')
    fireEvent.change(field, { target: { value: '' } })
    fireEvent.blur(field)
    expect(pupilNoteOf(readPupilNotes(), 'S-0002')).toBeNull()
  })

  it('uses semantic tokens on the field', () => {
    render(<PupilNotesField studentId="S-0003" studentName="Ravi" text="" />)
    const field = screen.getByLabelText('Note for Ravi')
    expect(field.className).toMatch(/bg-surface-1/)
    expect(field.className).toMatch(/border-hairline/)
    expect(field.className).toMatch(/text-value/)
  })
})
