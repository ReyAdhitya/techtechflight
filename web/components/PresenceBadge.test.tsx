import { describe, expect, it } from 'vitest'
import {
  clearLogbook,
  isStudentAbsent,
  readLogbook,
  registerStudent,
  setStudentAbsent,
} from '@/lib/logbook'
import { PresenceBadge } from './PresenceBadge'
import { render, screen } from '@testing-library/react'

describe('PresenceBadge', () => {
  it('labels Absent and Offline differently', () => {
    const { rerender } = render(<PresenceBadge kind="absent" />)
    expect(screen.getByText('Absent')).toHaveClass('text-status-not-ready')

    rerender(<PresenceBadge kind="offline" />)
    expect(screen.getByText('Offline')).toHaveClass('text-status-offline')
  })
})

describe('student absence in the Logbook', () => {
  it('marks a roster Student absent', () => {
    clearLogbook()
    const id = registerStudent('Priya')
    if (id === null) throw new Error('expected student id')
    setStudentAbsent(id, true)
    expect(isStudentAbsent(readLogbook(), id)).toBe(true)
  })
})
