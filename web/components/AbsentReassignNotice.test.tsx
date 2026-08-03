import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { AbsentReassignResult } from '@/lib/absent-reassign'
import { AbsentReassignNotice } from './AbsentReassignNotice'

describe('AbsentReassignNotice', () => {
  it('names the freed craft and who is next', () => {
    const result: AbsentReassignResult = {
      studentId: 'S-0001',
      studentName: 'Priya',
      freedDroneId: 'ttf-0001',
      nextWaitingName: 'Ravi',
    }

    render(
      <AbsentReassignNotice
        result={result}
        droneNames={{ 'ttf-0001': 'Drone 1' }}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Priya is absent. Drone 1 is free. Next: Ravi.',
    )
  })

  it('says nobody is waiting when the roster has no present spare', () => {
    const result: AbsentReassignResult = {
      studentId: 'S-0001',
      studentName: 'Priya',
      freedDroneId: 'ttf-0001',
      nextWaitingName: null,
    }

    render(<AbsentReassignNotice result={result} droneNames={{ 'ttf-0001': 'Drone 1' }} />)

    expect(screen.getByRole('status')).toHaveTextContent(
      'Priya is absent. Drone 1 is free. Nobody waiting.',
    )
  })

  it('renders nothing when there is no result yet', () => {
    const { container } = render(<AbsentReassignNotice result={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
