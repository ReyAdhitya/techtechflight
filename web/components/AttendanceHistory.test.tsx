import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AttendanceHistory } from './AttendanceHistory'

describe('AttendanceHistory', () => {
  it('shows present and absent counts in words, including zero', () => {
    render(
      <AttendanceHistory studentName="Amara" counts={{ present: 0, absent: 0 }} />,
    )
    const section = screen.getByLabelText('Attendance for Amara')
    expect(section.textContent).toMatch(/0 present, 0 absent/)
    expect(screen.getByRole('heading', { name: 'Attendance' })).toBeTruthy()
  })

  it('renders the tallies a Teacher sealed across Lessons', () => {
    render(
      <AttendanceHistory studentName="Priya" counts={{ present: 4, absent: 1 }} />,
    )
    const section = screen.getByLabelText('Attendance for Priya')
    expect(section.textContent).toMatch(/4/)
    expect(section.textContent).toMatch(/1/)
    expect(section.textContent).toMatch(/present/)
    expect(section.textContent).toMatch(/absent/)
  })

  it('uses semantic surface tokens, not the foreign base layer', () => {
    const { container } = render(
      <AttendanceHistory studentName="Ravi" counts={{ present: 2, absent: 0 }} />,
    )
    const section = container.querySelector('section')
    expect(section?.className).toMatch(/bg-surface-1/)
    expect(section?.className).toMatch(/border-hairline/)
    expect(section?.className).not.toMatch(/bg-background/)
  })
})
