import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  LessonNameConfirm,
  needsLessonName,
  UNTITLED_LESSON_LABEL,
} from './LessonNameConfirm'

describe('needsLessonName', () => {
  it('treats blank and Untitled as needing a name', () => {
    expect(needsLessonName('')).toBe(true)
    expect(needsLessonName('   ')).toBe(true)
    expect(needsLessonName(UNTITLED_LESSON_LABEL)).toBe(true)
    expect(needsLessonName('Year 8, period 3')).toBe(false)
  })
})

describe('LessonNameConfirm', () => {
  it('does not render when closed', () => {
    render(
      <LessonNameConfirm
        open={false}
        initialName=""
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('blocks close while the name is Untitled', () => {
    const onConfirm = vi.fn()
    render(
      <LessonNameConfirm
        open
        initialName={UNTITLED_LESSON_LABEL}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Untitled is not enough/)
    expect(screen.getByRole('button', { name: 'Confirm and close' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirm and close' }))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('confirms a real name so nothing is Untitled', () => {
    const onConfirm = vi.fn()
    render(
      <LessonNameConfirm
        open
        initialName=""
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )

    fireEvent.change(screen.getByLabelText('Lesson name'), {
      target: { value: 'Year 8, period 3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and close' }))

    expect(onConfirm).toHaveBeenCalledWith('Year 8, period 3')
  })

  it('keeps the lesson open on cancel', () => {
    const onCancel = vi.fn()
    render(
      <LessonNameConfirm
        open
        initialName="Period 3"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Keep lesson open' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
