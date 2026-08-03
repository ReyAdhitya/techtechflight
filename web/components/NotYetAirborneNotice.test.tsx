import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NotYetAirborneNotice } from './NotYetAirborneNotice'

describe('NotYetAirborneNotice', () => {
  it('names grounded craft with an assigned Student after the Lesson starts', () => {
    render(
      <NotYetAirborneNotice
        lessonStarted
        craft={[
          {
            droneId: 'a',
            callsign: 'Drone 1',
            studentName: 'Priya',
            airborne: false,
          },
          {
            droneId: 'b',
            callsign: 'Drone 2',
            studentName: 'Sam',
            airborne: true,
          },
        ]}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Drone 1 (Priya) has not taken off yet',
    )
  })

  it('is silent before the Lesson starts', () => {
    const { container } = render(
      <NotYetAirborneNotice
        lessonStarted={false}
        craft={[
          {
            droneId: 'a',
            callsign: 'Drone 1',
            studentName: 'Priya',
            airborne: false,
          },
        ]}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('is silent when every assigned craft is already up', () => {
    const { container } = render(
      <NotYetAirborneNotice
        lessonStarted
        craft={[
          {
            droneId: 'a',
            callsign: 'Drone 1',
            studentName: 'Priya',
            airborne: true,
          },
        ]}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
