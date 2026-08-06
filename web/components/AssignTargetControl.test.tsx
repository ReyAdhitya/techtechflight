import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { emptyMission } from '@/lib/mission'
import {
  AssignTargetControl,
  instructionWords,
  instructionsForDrone,
  recordAssignTargetInstruction,
  type MissionWithInstructions,
} from './AssignTargetControl'

const mission = (): MissionWithInstructions => ({
  ...emptyMission('m1', 'search-rescue', 'Search and Rescue'),
  startedAt: 1_000,
  droneIds: ['ttf-0001'],
})

const teams = [
  { teamId: 'team-1', teamName: 'Rescue 1', droneId: 'ttf-0001' as const },
] as const

const position = { eastM: 3.5, northM: -1.2 }

describe('recordAssignTargetInstruction', () => {
  it('appends an Instruction on the Mission. Never a Command (ADR-0021)', () => {
    const next = recordAssignTargetInstruction(mission(), {
      team: teams[0]!,
      position,
      givenBy: 'Ms Chen',
      at: 5_000,
    })

    expect(next.instructions).toHaveLength(1)
    expect(next.instructions![0]).toMatchObject({
      kind: 'assign-target',
      droneId: 'ttf-0001',
      teamName: 'Rescue 1',
      givenBy: 'Ms Chen',
      atPosition: position,
    })
    expect(instructionWords(next.instructions![0]!)).toMatch(/New target at/)
  })

  it('does nothing when the Teacher name is blank', () => {
    const before = mission()
    expect(
      recordAssignTargetInstruction(before, {
        team: teams[0]!,
        position,
        givenBy: '   ',
        at: 5_000,
      }),
    ).toBe(before)
  })
})

describe('AssignTargetControl', () => {
  it('records an Instruction when a Scope pick and team are chosen', async () => {
    const user = userEvent.setup()
    const onRecorded = vi.fn()

    render(
      <AssignTargetControl
        mission={mission()}
        pickedPosition={position}
        teams={teams}
        givenBy="Ms Chen"
        onRecorded={onRecorded}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Team'), 'team-1')
    await user.click(screen.getByRole('button', { name: 'Assign target' }))

    expect(onRecorded).toHaveBeenCalledOnce()
    const next = onRecorded.mock.calls[0]![0] as MissionWithInstructions
    expect(instructionsForDrone(next, 'ttf-0001')).toHaveLength(1)
    expect(next.instructions![0]!.kind).toBe('assign-target')
  })

  it('keeps Assign target disabled until the Scope is tapped', () => {
    render(
      <AssignTargetControl
        mission={mission()}
        pickedPosition={null}
        teams={teams}
        givenBy="Ms Chen"
      />,
    )

    expect(screen.getByRole('button', { name: 'Assign target' })).toBeDisabled()
    expect(screen.getByText(/Tap the Scope/i)).toBeInTheDocument()
  })

  it('shows Instructions on the strip they apply to', async () => {
    const user = userEvent.setup()
    const started = recordAssignTargetInstruction(mission(), {
      team: teams[0]!,
      position,
      givenBy: 'Ms Chen',
      at: 5_000,
    })

    render(
      <AssignTargetControl
        mission={started}
        pickedPosition={position}
        teams={teams}
        givenBy="Ms Chen"
      />,
    )

    await user.selectOptions(screen.getByLabelText('Team'), 'team-1')

    expect(screen.getByText(/Instructions on this strip/i)).toBeInTheDocument()
    expect(screen.getByText(/New target at/i)).toBeInTheDocument()
  })
})
