import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { aDroneState } from '@techtechflight/contract/fixtures'
import { MissingCraftNotice, MissingCraftNoticeView } from './MissingCraftNotice'

describe('MissingCraftNotice', () => {
  it('names craft absent since the last closed Lesson', () => {
    render(
      <MissingCraftNotice
        lastClosedLesson={{
          endedAt: 1,
          tally: {
            a: { faults: 0, dropouts: 0, flights: 1 },
            b: { faults: 0, dropouts: 0, flights: 1 },
          },
          commands: [
            { droneId: 'a', droneName: 'Drone 1' },
            { droneId: 'b', droneName: 'Drone 2' },
          ],
        }}
        drones={[
          aDroneState({ id: 'a', name: 'Drone 1', status: 'Ready' }),
          aDroneState({ id: 'b', name: 'Drone 2', status: 'Offline' }),
        ]}
      />,
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Drone 2')
    expect(alert).toHaveTextContent('did not come back')
    expect(alert).not.toHaveTextContent('Drone 1')
  })

  it('says nothing when every prior craft is still in contact', () => {
    const { container } = render(
      <MissingCraftNotice
        lastClosedLesson={{
          endedAt: 1,
          tally: { a: { faults: 0, dropouts: 0, flights: 1 } },
        }}
        drones={[aDroneState({ id: 'a', name: 'Drone 1', status: 'Ready' })]}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})

describe('MissingCraftNoticeView', () => {
  it('lists several missing craft by name', () => {
    render(
      <MissingCraftNoticeView
        missing={[
          { id: 'b', name: 'Drone 2' },
          { id: 'c', name: 'Drone 3' },
        ]}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Drone 2')
    expect(screen.getByRole('alert')).toHaveTextContent('Drone 3')
  })
})
