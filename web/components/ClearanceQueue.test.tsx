import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  emptyClearanceState,
  grantClearance,
  isCleared,
  isHeld,
  syncClearanceQueue,
} from '@/lib/clearance'
import { emptyMission } from '@/lib/mission'
import { CLEARANCE_QUEUE_EMPTY, ClearanceQueue, type ClearanceQueueCraft } from './ClearanceQueue'

const mission = () => ({
  ...emptyMission('m1', 'search-rescue', 'Search and Rescue'),
  startedAt: 1_000,
  droneIds: ['ttf-0001', 'ttf-0002'] as const,
})

const readyCraft = (
  droneId: 'ttf-0001' | 'ttf-0002',
  overrides: Partial<ClearanceQueueCraft> = {},
): ClearanceQueueCraft => ({
  input: {
    droneId,
    status: 'Ready',
    studentId: droneId === 'ttf-0001' ? 'stu-ada' : 'stu-bea',
    preFlightDone: true,
    mission: mission(),
  },
  droneName: droneId === 'ttf-0001' ? 'Drone 1' : 'Drone 2',
  teamName: droneId === 'ttf-0001' ? 'Rescue 1' : 'Rescue 2',
  studentName: droneId === 'ttf-0001' ? 'Ada' : 'Bea',
  ...overrides,
})

describe('ClearanceQueue', () => {
  it('explains itself when the queue is empty, with the count at zero', () => {
    render(
      <ClearanceQueue
        state={emptyClearanceState()}
        craft={[]}
        grantedBy="Ms Chen"
        now={2_000}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Awaiting clearance' })).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === '0 awaiting'),
    ).toBeInTheDocument()
    expect(screen.getByText(CLEARANCE_QUEUE_EMPTY)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('syncs craft into the queue themselves and lists them in board order', () => {
    function Harness() {
      const [state, setState] = useState(emptyClearanceState)
      return (
        <ClearanceQueue
          state={state}
          craft={[readyCraft('ttf-0001'), readyCraft('ttf-0002')]}
          grantedBy="Ms Chen"
          now={2_000}
          onStateChange={setState}
        />
      )
    }

    render(<Harness />)

    expect(
      screen.getByText((_, element) => element?.textContent === '2 awaiting'),
    ).toBeInTheDocument()

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText('Rescue 1')).toBeInTheDocument()
    expect(within(items[0]!).getByText(/Flown by Ada/)).toBeInTheDocument()
    expect(within(items[1]!).getByText('Rescue 2')).toBeInTheDocument()
  })

  it('grants takeoff for one craft and drops it from the queue', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [state, setState] = useState(() =>
        syncClearanceQueue(emptyClearanceState(), [readyCraft('ttf-0001').input], 2_000),
      )
      return (
        <ClearanceQueue
          state={state}
          craft={[readyCraft('ttf-0001')]}
          grantedBy="Ms Chen"
          now={3_000}
          onStateChange={setState}
        />
      )
    }

    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Grant takeoff' }))

    expect(screen.getByText(CLEARANCE_QUEUE_EMPTY)).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === '0 awaiting'),
    ).toBeInTheDocument()
  })

  it('holds takeoff and drops the craft from the queue without granting', async () => {
    const user = userEvent.setup()
    let latest = syncClearanceQueue(emptyClearanceState(), [readyCraft('ttf-0001').input], 2_000)

    render(
      <ClearanceQueue
        state={latest}
        craft={[readyCraft('ttf-0001')]}
        grantedBy="Ms Chen"
        now={3_000}
        onStateChange={(next) => {
          latest = next
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Hold' }))

    expect(isHeld(latest, 'ttf-0001', 'm1')).toBe(true)
    expect(isCleared(latest, 'ttf-0001', 'm1')).toBe(false)
  })

  it('records who granted takeoff on the state the Integrator holds', async () => {
    const user = userEvent.setup()
    let latest = syncClearanceQueue(emptyClearanceState(), [readyCraft('ttf-0001').input], 2_000)

    render(
      <ClearanceQueue
        state={latest}
        craft={[readyCraft('ttf-0001')]}
        grantedBy="Ms Chen"
        now={3_000}
        onStateChange={(next) => {
          latest = next
        }}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Grant takeoff' }))

    expect(isCleared(latest, 'ttf-0001', 'm1')).toBe(true)
    expect(latest.records[0]?.grantedBy).toBe('Ms Chen')
    expect(latest.records[0]?.grantedAt).toBe(3_000)
  })

  it('refuses to grant when disabled or the Teacher name is blank', () => {
    const onStateChange = vi.fn()
    const state = syncClearanceQueue(emptyClearanceState(), [readyCraft('ttf-0001').input], 2_000)

    const { rerender } = render(
      <ClearanceQueue
        state={state}
        craft={[readyCraft('ttf-0001')]}
        grantedBy="Ms Chen"
        disabled
        now={3_000}
        onStateChange={onStateChange}
      />,
    )

    expect(screen.getByRole('button', { name: 'Grant takeoff' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Hold' })).toBeDisabled()

    rerender(
      <ClearanceQueue
        state={state}
        craft={[readyCraft('ttf-0001')]}
        grantedBy="   "
        now={3_000}
        onStateChange={onStateChange}
      />,
    )

    expect(screen.getByRole('button', { name: 'Grant takeoff' })).toBeDisabled()
  })

  it('keeps a granted craft out after grantClearance wrote the record', () => {
    const granted = grantClearance(
      syncClearanceQueue(emptyClearanceState(), [readyCraft('ttf-0001').input], 2_000),
      'ttf-0001',
      'm1',
      'Ms Chen',
      3_000,
    )

    render(
      <ClearanceQueue
        state={granted}
        craft={[readyCraft('ttf-0001')]}
        grantedBy="Ms Chen"
        now={4_000}
      />,
    )

    expect(screen.getByText(CLEARANCE_QUEUE_EMPTY)).toBeInTheDocument()
  })
})
