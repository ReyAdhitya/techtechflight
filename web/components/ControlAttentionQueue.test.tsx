import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DroneId } from '@techtechflight/contract'
import { alertQueue, type DroneVitals } from '@/lib/vitals'
import { ControlAttentionQueue } from './ControlAttentionQueue'

const aVitals = (overrides: Partial<DroneVitals> = {}): DroneVitals => ({
  droneId: 'ttf-0001',
  callsign: 'Drone 1',
  status: 'Flying',
  phase: 'level',
  airborne: true,
  altitudeM: 1.5,
  verticalRateMps: 0,
  groundSpeedMps: null,
  batteryFraction: 0.6,
  enduranceMs: null,
  responseAgeMs: 1_000,
  position: { eastM: 0, northM: 0 },
  separationM: null,
  conflictWith: null,
  alerts: [],
  ...overrides,
})

const nobody = () => null

describe('ControlAttentionQueue', () => {
  it('renders nothing when the queue is empty', () => {
    render(
      <ControlAttentionQueue
        queue={alertQueue([aVitals()])}
        studentFor={nobody}
        selected={null}
        onSelect={() => {}}
      />,
    )

    expect(screen.queryByRole('navigation', { name: 'Attention queue' })).not.toBeInTheDocument()
  })

  it('lists every unacknowledged alert worst first', () => {
    const vitals = [
      aVitals({
        droneId: 'ttf-0002',
        callsign: 'Drone 2',
        alerts: [{ kind: 'battery-low', severity: 'info', text: 'Put it on charge.', since: 10 }],
      }),
      aVitals({
        droneId: 'ttf-0003',
        callsign: 'Drone 3',
        alerts: [
          { kind: 'separation', severity: 'critical', text: 'Separate it from Drone 1.', since: 20 },
          { kind: 'obstacle', severity: 'warning', text: 'Move it away from the wall.', since: 30 },
        ],
      }),
    ]

    render(
      <ControlAttentionQueue
        queue={alertQueue(vitals)}
        studentFor={nobody}
        selected={null}
        onSelect={() => {}}
      />,
    )

    const dock = screen.getByRole('navigation', { name: 'Attention queue' })
    const buttons = dock.querySelectorAll('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]).toHaveTextContent('Separate it from Drone 1')
    expect(buttons[1]).toHaveTextContent('Move it away from the wall')
    expect(buttons[2]).toHaveTextContent('Put it on charge')
  })

  it('names the Student when one is assigned', () => {
    const vitals = [
      aVitals({
        alerts: [{ kind: 'battery-low', severity: 'info', text: 'Put it on charge.', since: 10 }],
      }),
    ]

    render(
      <ControlAttentionQueue
        queue={alertQueue(vitals)}
        studentFor={(droneId: DroneId) => (droneId === 'ttf-0001' ? 'Priya' : null)}
        selected={null}
        onSelect={() => {}}
      />,
    )

    expect(screen.getByText(/Flown by Priya/)).toBeInTheDocument()
  })

  it('hands back the entry that was clicked', async () => {
    const vitals = [
      aVitals({
        droneId: 'ttf-0003',
        callsign: 'Drone 3',
        alerts: [{ kind: 'separation', severity: 'critical', text: 'Separate it.', since: 20 }],
      }),
    ]
    const picked: string[] = []
    const onSelect = vi.fn((entry) => picked.push(`${entry.droneId}:${entry.kind}`))

    render(
      <ControlAttentionQueue
        queue={alertQueue(vitals)}
        studentFor={nobody}
        selected={null}
        onSelect={onSelect}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Separate it/i }))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(picked).toEqual(['ttf-0003:separation'])
  })

  it('marks the selected Drone as current', () => {
    const vitals = [
      aVitals({
        droneId: 'ttf-0002',
        callsign: 'Drone 2',
        alerts: [{ kind: 'battery-low', severity: 'info', text: 'Charge it.', since: 10 }],
      }),
    ]

    render(
      <ControlAttentionQueue
        queue={alertQueue(vitals)}
        studentFor={nobody}
        selected="ttf-0002"
        onSelect={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: /Charge it/i })).toHaveAttribute('aria-current', 'true')
  })
})
