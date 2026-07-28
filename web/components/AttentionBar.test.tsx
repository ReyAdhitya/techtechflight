import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DroneId } from '@techtechflight/contract'
import { alertQueue, type DroneVitals } from '@/lib/vitals'
import { AttentionBar } from './AttentionBar'

/**
 * What needs the Teacher next.
 *
 * The point of this bar is what it leaves out. A controller works a queue down one item at
 * a time; a list of everything wrong is the triage handed back to the person it was meant
 * to spare.
 */

const aVitals = (overrides: Partial<DroneVitals> = {}): DroneVitals => ({
  droneId: 'ttf-0001',
  callsign: 'Drone 1',
  status: 'Flying',
  phase: 'level',
  airborne: true,
  altitudeM: 1.5,
  verticalRateMps: 0,
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

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('0')
    expect(screen.getByText(/No items require action/i)).toBeInTheDocument()
  })

  it('still shows the count, so its return is a number changing', () => {
    bar([aVitals()])

    // Present at zero on purpose. A count that vanishes makes the next Alert an element
    // materialising somewhere new, which is the opposite of glanceable.
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
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

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('3')
  })

  it('shows only the worst, and not the others', () => {
    bar(busy)

    expect(screen.getByText(/Separate it from Drone 1/)).toBeInTheDocument()
    expect(screen.queryByText(/Put it on charge/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Move it away from the wall/)).not.toBeInTheDocument()
  })

  it('says how soon in a word, so the ordering does not rest on colour', () => {
    bar(busy)

    expect(screen.getByRole('status', { name: /items requiring action/i })).toHaveTextContent('Now')
  })

  it('names the Student flying it, because that is who the Teacher speaks to', () => {
    bar(busy, (droneId) => (droneId === 'ttf-0003' ? 'Priya' : null))

    expect(screen.getByText(/Flown by Priya/)).toBeInTheDocument()
  })

  it('says nothing about who is flying when nobody has been written down', () => {
    bar(busy)

    expect(screen.queryByText(/Flown by/)).not.toBeInTheDocument()
  })

  it('offers to take the one it is showing, and hands back which one that was', async () => {
    const taken: string[] = []
    render(
      <AttentionBar
        queue={alertQueue(busy)}
        studentFor={nobody}
        onAcknowledge={(entry) => taken.push(`${entry.droneId}:${entry.kind}`)}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /I have this/i }))

    expect(taken).toEqual(['ttf-0003:separation'])
  })

  it('offers nothing to take when there is nothing to take', () => {
    render(<AttentionBar queue={alertQueue([aVitals()])} studentFor={nobody} onAcknowledge={() => {}} />)

    expect(screen.queryByRole('button', { name: /I have this/i })).not.toBeInTheDocument()
  })
})
