import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PupilFlightHours } from './PupilFlightHours'

describe('PupilFlightHours', () => {
  it('shows zero minutes when nothing has accumulated', () => {
    render(
      <PupilFlightHours
        studentName="Amara"
        hours={{ studentKey: 'S-1', airborneMs: 0, lessonCount: 0 }}
      />,
    )
    const section = screen.getByLabelText('Flight time for Amara')
    expect(section.textContent).toMatch(/0 min/)
    expect(section.textContent).toMatch(/0 Lessons/)
  })

  it('formats accumulated time beside the Lesson count', () => {
    render(
      <PupilFlightHours
        studentName="Priya"
        hours={{ studentKey: 'S-2', airborneMs: 3_660_000, lessonCount: 3 }}
      />,
    )
    const section = screen.getByLabelText('Flight time for Priya')
    expect(section.textContent).toMatch(/1 h 1 min/)
    expect(section.textContent).toMatch(/3 Lessons/)
  })

  it('says when the figure is approximate', () => {
    render(
      <PupilFlightHours
        studentName="Ravi"
        hours={{ studentKey: 'S-3', airborneMs: 60_000, lessonCount: 1 }}
        approximate
      />,
    )
    expect(screen.getByLabelText('Flight time for Ravi').textContent).toMatch(/Approximate/)
  })

  it('uses semantic surface tokens', () => {
    const { container } = render(
      <PupilFlightHours
        studentName="Amara"
        hours={{ studentKey: 'S-1', airborneMs: 0, lessonCount: 0 }}
      />,
    )
    const section = container.querySelector('section')
    expect(section?.className).toMatch(/bg-surface-1/)
    expect(section?.className).toMatch(/border-hairline/)
  })
})
