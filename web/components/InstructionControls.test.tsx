import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { emptyMission } from '@/lib/mission'
import { instructionWords, type MissionWithInstructions } from './AssignTargetControl'
import {
  InstructionControls,
  instructionsForStrip,
  recordReprioritiseInstruction,
  recordRerouteInstruction,
} from './InstructionControls'

const mission = (): MissionWithInstructions => ({
  ...emptyMission('m1', 'search-rescue', 'Search and Rescue'),
  startedAt: 1_000,
  droneIds: ['ttf-0001'],
})

const craft = {
  droneId: 'ttf-0001' as const,
  droneName: 'Drone 1',
  teamId: 'team-1',
  teamName: 'Rescue 1',
}

describe('recordRerouteInstruction and recordReprioritiseInstruction', () => {
  it('records both kinds on the Mission for the strip drone', () => {
    let next = recordRerouteInstruction(mission(), {
      craft,
      givenBy: 'Ms Chen',
      at: 2_000,
    })
    next = recordReprioritiseInstruction(next, {
      craft,
      givenBy: 'Ms Chen',
      at: 3_000,
    })

    const strip = instructionsForStrip(next, 'ttf-0001')
    expect(strip).toHaveLength(2)
    expect(strip[0]!.kind).toBe('reroute')
    expect(strip[1]!.kind).toBe('reprioritise')
    expect(instructionWords(strip[0]!)).toBe('Reroute')
    expect(instructionWords(strip[1]!)).toBe('Reprioritised')
  })
})

describe('InstructionControls', () => {
  it('records reroute and reprioritise as Instructions visible on the strip', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [current, setCurrent] = useState(mission())
      return (
        <InstructionControls
          mission={current}
          craft={craft}
          givenBy="Ms Chen"
          onRecorded={setCurrent}
        />
      )
    }

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Reroute' }))
    await user.click(screen.getByRole('button', { name: 'Reprioritise' }))

    expect(screen.getByText(/Recorded on this strip/i)).toBeInTheDocument()
    const list = screen.getByText(/Recorded on this strip/i).parentElement!
    expect(list).toHaveTextContent('Reroute')
    expect(list).toHaveTextContent('Reprioritised')
  })

  it('refuses to record before the Mission has started', () => {
    render(
      <InstructionControls
        mission={emptyMission('m1', 'search-rescue', 'Search and Rescue')}
        craft={craft}
        givenBy="Ms Chen"
      />,
    )

    expect(screen.getByRole('button', { name: 'Reroute' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reprioritise' })).toBeDisabled()
  })
})
