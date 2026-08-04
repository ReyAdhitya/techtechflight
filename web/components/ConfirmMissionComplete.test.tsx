import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { emptyMission } from '@/lib/mission'
import { scenarioById } from '@/lib/mission-scenarios'
import {
  airborneMissionCraft,
  canConfirmMissionComplete,
  ConfirmMissionComplete,
  sealMissionComplete,
} from './ConfirmMissionComplete'

const mission = () => ({
  ...emptyMission('m1', 'search-rescue', 'Search and Rescue'),
  startedAt: 1_000,
  droneIds: ['ttf-0001', 'ttf-0002'] as const,
})

const craft = [
  { droneId: 'ttf-0001' as const, droneName: 'Drone 1', airborne: false },
  { droneId: 'ttf-0002' as const, droneName: 'Drone 2', airborne: false },
]

const judges = scenarioById('search-rescue')!.judges
const evidence = {
  tasksCompleted: true,
  routeCoverageKnown: true,
  routeSafe: true,
  hadCollision: false,
  noFlyViolations: 0,
}

describe('canConfirmMissionComplete', () => {
  it('allows confirm when every Mission craft is down', () => {
    expect(canConfirmMissionComplete(mission(), craft)).toBe(true)
  })

  it('refuses while any Mission craft is still airborne', () => {
    expect(
      canConfirmMissionComplete(mission(), [
        { ...craft[0]!, airborne: false },
        { ...craft[1]!, airborne: true },
      ]),
    ).toBe(false)
    expect(airborneMissionCraft(mission(), craft)[0]?.droneName).toBeUndefined()
    expect(
      airborneMissionCraft(mission(), [
        { ...craft[0]!, airborne: false },
        { ...craft[1]!, airborne: true },
      ]).map((row) => row.droneName),
    ).toEqual(['Drone 2'])
  })
})

describe('sealMissionComplete', () => {
  it('seals the Mission and its score', () => {
    const next = sealMissionComplete({
      mission: mission(),
      craft,
      judges,
      evidence,
      now: 9_000,
    })

    expect(next.outcome).toMatchObject({
      endedAt: 9_000,
      score: 1,
    })
    expect(next.outcome?.failures).toEqual([])
  })
})

describe('ConfirmMissionComplete', () => {
  it('seals when every craft is down and refuses while airborne', async () => {
    const user = userEvent.setup()
    const onConfirmed = vi.fn()

    const { rerender } = render(
      <ConfirmMissionComplete
        mission={mission()}
        craft={[
          { ...craft[0]!, airborne: false },
          { ...craft[1]!, airborne: true },
        ]}
        judges={judges}
        evidence={evidence}
        onConfirmed={onConfirmed}
      />,
    )

    expect(screen.getByRole('button', { name: 'Confirm mission complete' })).toBeDisabled()
    expect(screen.getByText(/Still airborne: Drone 2/i)).toBeInTheDocument()

    rerender(
      <ConfirmMissionComplete
        mission={mission()}
        craft={craft}
        judges={judges}
        evidence={evidence}
        onConfirmed={onConfirmed}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Confirm mission complete' }))
    expect(onConfirmed).toHaveBeenCalledOnce()
    expect(onConfirmed.mock.calls[0]![0].outcome?.score).toBe(1)
  })
})
