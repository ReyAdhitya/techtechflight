import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DroneId } from '@techtechflight/contract'
import { alertQueue, type DroneVitals } from '@/lib/vitals'
import { playbookFor } from '@/lib/incident-playbook'
import { AttentionBar } from './AttentionBar'

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
const bar = (vitals: readonly DroneVitals[], studentFor: (id: DroneId) => string | null = nobody) =>
  render(<AttentionBar queue={alertQueue(vitals)} studentFor={studentFor} />)

describe('when nothing needs the Teacher', () => {
  it('says so, rather than showing an empty space', () => {
    bar([aVitals()])

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('0')
    expect(screen.getByText(/No items require action/i)).toBeInTheDocument()
  })

  it('still shows the count, so its return is a number changing', () => {
    bar([aVitals()])
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })
})

describe('when several things need the Teacher', () => {
  const busy = [
    aVitals({
      droneId: 'ttf-0002',
      callsign: 'Drone 2',
      alerts: [
        { kind: 'battery-low', severity: 'info', text: 'Put it on charge.', since: 10 },
      ],
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

  it('counts every one of them', () => {
    bar(busy)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('3')
  })

  it('puts the worst Alert on a compact focused card, not only in a disclosure summary', () => {
    bar(busy)

    const card = screen.getByRole('article')
    expect(card).toHaveTextContent(/Separate it from Drone 1/)
    expect(card).toHaveTextContent('Now')
    expect(card).toHaveTextContent('Drone 3')
    expect(within(card).getByRole('button', { name: /Respond/i })).toBeInTheDocument()
  })

  it('keeps playbook responses out of the board until Respond opens a dialog', () => {
    bar(busy)

    expect(screen.queryByRole('button', { name: /Hold position/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the full queue inside a closed disclosure', () => {
    bar(busy)

    expect(screen.getByText(/2 more in the queue/i)).toBeInTheDocument()

    const list = screen.getByRole('list', { name: /items requiring action/i })
    expect(within(list).getByText(/Separate it from Drone 1/)).toBeInTheDocument()
    expect(within(list).getByText(/Put it on charge/)).toBeInTheDocument()
    expect(within(list).getByText(/Move it away from the wall/)).toBeInTheDocument()
  })

  it('names the Student flying it, because that is who the Teacher speaks to', () => {
    bar(busy, (droneId) => (droneId === 'ttf-0003' ? 'Priya' : null))
    expect(screen.getAllByText(/Flown by Priya/).length).toBeGreaterThanOrEqual(1)
  })

  it('says nothing about who is flying when nobody has been written down', () => {
    bar(busy)
    expect(screen.queryByText(/Flown by/)).not.toBeInTheDocument()
  })

  it('offers to take the focused item, and hands back which one that was', async () => {
    const taken: string[] = []
    render(
      <AttentionBar
        queue={alertQueue(busy)}
        studentFor={nobody}
        onAcknowledge={(entry) => taken.push(`${entry.droneId}:${entry.kind}`)}
      />,
    )

    const card = screen.getByRole('article')
    await userEvent.click(
      within(card).getByRole('button', { name: /I have this — Drone 3, Separate it from Drone 1/i }),
    )

    expect(taken).toEqual(['ttf-0003:separation'])
  })

  it('offers playbook responses in a dialog after Respond', async () => {
    const entry = playbookFor('separation')!
    const onResponse = vi.fn()
    render(
      <AttentionBar
        queue={alertQueue(busy)}
        studentFor={nobody}
        onResponse={onResponse}
      />,
    )

    await userEvent.click(
      within(screen.getByRole('article')).getByRole('button', {
        name: /Respond — Drone 3, Separate it from Drone 1/i,
      }),
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName(/Respond — Drone 3/i)
    await userEvent.click(within(dialog).getByRole('button', { name: /Hold position/i }))

    expect(onResponse).toHaveBeenCalledOnce()
    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({ droneId: 'ttf-0003', kind: 'separation' }),
      entry.responses[0],
      0,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('links to the focused Drone for details from the Respond dialog', async () => {
    bar(busy)

    await userEvent.click(
      within(screen.getByRole('article')).getByRole('button', { name: /Respond/i }),
    )

    expect(
      within(screen.getByRole('dialog')).getByRole('link', { name: /View Drone details/i }),
    ).toHaveAttribute('href', '/drone?id=ttf-0003')
  })

  it('offers nothing to take when there is nothing to take', () => {
    render(<AttentionBar queue={alertQueue([aVitals()])} studentFor={nobody} onAcknowledge={() => {}} />)
    expect(screen.queryByRole('button', { name: /I have this/i })).not.toBeInTheDocument()
  })
})
