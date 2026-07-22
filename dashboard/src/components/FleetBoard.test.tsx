import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  aDroneState,
  aFleetInEveryStatus,
  aFleetState,
  aNeverHeardFromDrone,
  aTelemetry,
} from '@techtechflight/contract/fixtures'
import type { DroneState } from '@techtechflight/contract'
import { FleetBoard } from './FleetBoard.tsx'
import type { FleetSnapshot } from '../fleet-connection.ts'

/**
 * Seam 2. Driven by Fleet State fixtures, observed through rendered output as a Teacher
 * would perceive it — never through component internals.
 */

const GENERATED_AT = 5_000_000

const board = (drones: readonly DroneState[], overrides: Partial<FleetSnapshot> = {}) => {
  const snapshot: FleetSnapshot = {
    connection: 'live',
    state: aFleetState(drones, GENERATED_AT),
    receivedAt: GENERATED_AT,
    ...overrides,
  }
  return render(<FleetBoard snapshot={snapshot} now={GENERATED_AT} />)
}

const tile = (name: string) => screen.getByRole('article', { name })
const attentionCount = () => screen.getByRole('status', { name: /needing attention/i })

describe('seeing the Fleet', () => {
  it('shows every Drone the School owns on one screen', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1' }),
      aDroneState({ id: 'b', name: 'Drone 2' }),
      aNeverHeardFromDrone({ id: 'c', name: 'Drone 3' }),
    ])

    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('keeps Drones in the order the ground station gave, whatever their Status', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Fault' }),
      aDroneState({ id: 'b', name: 'Drone 2', status: 'Ready' }),
      aDroneState({ id: 'c', name: 'Drone 3', status: 'Not Ready' }),
    ])

    const names = screen.getAllByRole('article').map((article) => within(article).getByRole('heading').textContent)
    expect(names).toEqual(['Drone 1', 'Drone 2', 'Drone 3'])
  })
})

describe('the summary that answers the question', () => {
  it('counts the Drones a Teacher can hand to a Student', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Ready' }),
      aDroneState({ id: 'b', name: 'Drone 2', status: 'Ready' }),
      aDroneState({ id: 'c', name: 'Drone 3', status: 'Fault' }),
    ])

    expect(screen.getByText(/of 3 ready/)).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows the Needs Attention count even when nothing needs attention', () => {
    board([aDroneState({ id: 'a', name: 'Drone 1', status: 'Ready' })])

    expect(screen.getByText(/0 need attention/)).toBeInTheDocument()
  })

  it('groups Not Ready and Fault together as Needs Attention', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Not Ready' }),
      aDroneState({ id: 'b', name: 'Drone 2', status: 'Fault' }),
      aDroneState({ id: 'c', name: 'Drone 3', status: 'Ready' }),
    ])

    expect(screen.getByText(/2 need attention/)).toBeInTheDocument()
  })

  it('does not count a Flying Drone as usable or as needing attention', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Flying' }),
      aDroneState({ id: 'b', name: 'Drone 2', status: 'Ready' }),
    ])

    expect(screen.getByText(/of 2 ready/)).toBeInTheDocument()
    expect(screen.getByText(/0 need attention/)).toBeInTheDocument()
    expect(screen.getByText('1 flying')).toBeInTheDocument()
  })

  it('makes the count a Teacher came to read the heading of the board', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Ready' }),
      aDroneState({ id: 'b', name: 'Drone 2', status: 'Fault' }),
    ])

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('1 of 2 ready')
  })

  it('announces the Needs Attention count to a Teacher who is watching the room', () => {
    board([aDroneState({ id: 'a', name: 'Drone 1', status: 'Fault' })])

    expect(attentionCount()).toHaveTextContent('1 needs attention')
  })

  it('speaks more quietly when everything needing attention can be fixed before the lesson', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Not Ready' }),
      aDroneState({ id: 'b', name: 'Drone 2', status: 'Ready' }),
    ])

    expect(attentionCount()).toHaveAttribute('data-severity', 'fixable')
  })

  it('speaks at full volume once a Drone has to come out of the set', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Not Ready' }),
      aDroneState({ id: 'b', name: 'Drone 2', status: 'Fault' }),
    ])

    expect(attentionCount()).toHaveAttribute('data-severity', 'fault')
  })

  it('carries no severity at all when nothing needs a Teacher', () => {
    board([aDroneState({ id: 'a', name: 'Drone 1', status: 'Ready' })])

    expect(attentionCount()).not.toHaveAttribute('data-severity')
  })
})

describe('Status without relying on colour', () => {
  it('renders the whole Status vocabulary from the shared Fleet State fixture', () => {
    // The same fixture the ground station's own tests are shaped against. A change to
    // Fleet State that breaks one seam has to break the other.
    const state = aFleetInEveryStatus(GENERATED_AT)
    render(
      <FleetBoard
        snapshot={{ connection: 'live', state, receivedAt: GENERATED_AT }}
        now={GENERATED_AT}
      />,
    )

    for (const status of ['Ready', 'Not Ready', 'Fault', 'Flying', 'Offline']) {
      expect(screen.getByText(status)).toBeInTheDocument()
    }
    expect(screen.getAllByRole('article')).toHaveLength(state.drones.length)
  })

  it('writes the precise Status on every tile', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Ready' }),
      aDroneState({ id: 'b', name: 'Drone 2', status: 'Not Ready' }),
      aDroneState({ id: 'c', name: 'Drone 3', status: 'Fault' }),
      aDroneState({ id: 'd', name: 'Drone 4', status: 'Flying' }),
      aNeverHeardFromDrone({ id: 'e', name: 'Drone 5' }),
    ])

    expect(within(tile('Drone 1')).getByText('Ready')).toBeInTheDocument()
    expect(within(tile('Drone 2')).getByText('Not Ready')).toBeInTheDocument()
    expect(within(tile('Drone 3')).getByText('Fault')).toBeInTheDocument()
    expect(within(tile('Drone 4')).getByText('Flying')).toBeInTheDocument()
    expect(within(tile('Drone 5')).getByText('Offline')).toBeInTheDocument()
  })

  it('conveys battery to a screen reader as a labelled progress bar', () => {
    board([
      aDroneState({
        id: 'a',
        name: 'Drone 1',
        telemetry: aTelemetry({ batteryFraction: 0.82 }),
      }),
    ])

    const battery = within(tile('Drone 1')).getByRole('progressbar', { name: /battery/i })
    expect(battery).toHaveAttribute('aria-valuenow', '82')
  })

  it('says when a battery reading is only an estimate', () => {
    board([
      aDroneState({
        id: 'a',
        name: 'Drone 1',
        telemetry: aTelemetry({ batteryFraction: 0.5, batteryIsEstimate: true }),
      }),
    ])

    expect(
      within(tile('Drone 1')).getByRole('progressbar', { name: /estimated/i }),
    ).toBeInTheDocument()
  })
})

describe('trusting what is on screen', () => {
  it('qualifies a current reading with its age', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1', lastContact: GENERATED_AT - 2_000 }),
    ])

    expect(within(tile('Drone 1')).getByText(/heard from just now/i)).toBeInTheDocument()
  })

  it('counts the age up as the snapshot sits on screen', () => {
    const snapshot: FleetSnapshot = {
      connection: 'live',
      state: aFleetState(
        [aDroneState({ id: 'a', name: 'Drone 1', lastContact: GENERATED_AT })],
        GENERATED_AT,
      ),
      receivedAt: GENERATED_AT,
    }

    render(<FleetBoard snapshot={snapshot} now={GENERATED_AT + 90_000} />)

    expect(screen.getByText(/heard from 1m ago/i)).toBeInTheDocument()
  })

  it('marks Stale Telemetry as distinct from current Telemetry', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1', stale: false, lastContact: GENERATED_AT }),
      aDroneState({ id: 'b', name: 'Drone 2', stale: true, lastContact: GENERATED_AT - 30_000 }),
    ])

    const current = within(tile('Drone 1')).getByText(/heard from/i)
    const stale = within(tile('Drone 2')).getByText(/heard from/i)

    expect(current).not.toHaveAttribute('data-stale')
    expect(stale).toHaveAttribute('data-stale')
  })

  it('shows an Offline Drone its last known battery, with the age attached', () => {
    board([
      aDroneState({
        id: 'a',
        name: 'Drone 1',
        status: 'Offline',
        stale: true,
        lastContact: GENERATED_AT - 3 * 60 * 60 * 1_000,
        telemetry: aTelemetry({ batteryFraction: 0.64 }),
      }),
    ])

    const droneTile = within(tile('Drone 1'))
    expect(droneTile.getByRole('progressbar', { name: /last known battery/i })).toBeInTheDocument()
    expect(droneTile.getByText(/heard from 3h ago/i)).toBeInTheDocument()
  })

  it('tells a Drone never heard from apart from one that has fallen silent', () => {
    board([
      aNeverHeardFromDrone({ id: 'a', name: 'Drone 1' }),
      aDroneState({
        id: 'b',
        name: 'Drone 2',
        status: 'Offline',
        stale: true,
        lastContact: GENERATED_AT - 600_000,
      }),
    ])

    expect(within(tile('Drone 1')).getByText('Never heard from')).toBeInTheDocument()
    expect(within(tile('Drone 1')).getByText('No Telemetry yet')).toBeInTheDocument()
    expect(within(tile('Drone 2')).getByText(/heard from 10m ago/i)).toBeInTheDocument()
  })
})

describe('when a charging Drone will be usable again', () => {
  it('says so when the ground station has watched the charge go in', () => {
    board([
      aDroneState({
        id: 'a',
        name: 'Drone 1',
        status: 'Not Ready',
        timeToReadyMs: 12 * 60_000,
      }),
    ])

    expect(within(tile('Drone 1')).getByText('Ready in ~12 min')).toBeInTheDocument()
  })

  it('says nothing at all when there is no honest forecast to give', () => {
    // The resting case, and the permanent one for a School that swaps packs rather than
    // charging them in place. Absent rather than empty: a Teacher must not read a blank
    // where a number goes and wonder whether it is still loading.
    board([
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Not Ready', timeToReadyMs: null }),
    ])

    expect(within(tile('Drone 1')).queryByText(/ready in/i)).not.toBeInTheDocument()
  })

  it('marks the forecast as an estimate, the way an estimated battery is marked', () => {
    board([
      aDroneState({
        id: 'a',
        name: 'Drone 1',
        status: 'Not Ready',
        timeToReadyMs: 60_000,
      }),
    ])

    expect(within(tile('Drone 1')).getByText(/~1 min/)).toBeInTheDocument()
  })
})

describe('the board losing the ground station', () => {
  it('says so in words about the board, not about the Drones', () => {
    board([aDroneState({ id: 'a', name: 'Drone 1' })], { connection: 'unreachable' })

    const banner = screen.getByRole('status', { name: /ground station connection/i })
    expect(banner).toHaveTextContent(/this board cannot reach the ground station/i)
    expect(banner).not.toHaveTextContent(/offline/i)
  })

  it('keeps showing the last known Fleet rather than going blank', () => {
    board([aDroneState({ id: 'a', name: 'Drone 1', status: 'Ready' })], {
      connection: 'unreachable',
    })

    expect(tile('Drone 1')).toBeInTheDocument()
  })

  it('says nothing at all while the ground station is reachable', () => {
    board([aDroneState({ id: 'a', name: 'Drone 1' })])

    expect(screen.queryByRole('status', { name: /ground station connection/i })).not.toBeInTheDocument()
  })

  it('does not treat a Fleet of Offline Drones as the board being unreachable', () => {
    board([
      aDroneState({ id: 'a', name: 'Drone 1', status: 'Offline', stale: true }),
      aDroneState({ id: 'b', name: 'Drone 2', status: 'Offline', stale: true }),
    ])

    expect(screen.queryByRole('status', { name: /ground station connection/i })).not.toBeInTheDocument()
  })
})

describe('opening a single Drone', () => {
  it('shows everything reported about it', async () => {
    const user = userEvent.setup()
    board([
      aDroneState({
        id: 'a',
        name: 'Drone 1',
        status: 'Fault',
        lastContact: GENERATED_AT - 1_000,
        telemetry: aTelemetry({
          batteryFraction: 0.44,
          fault: { code: 'IMU_CALIBRATION', description: 'Motion sensor needs recalibrating' },
          extra: { motorTemperatureC: 41.2, firmware: '1.4.2' },
        }),
      }),
    ])

    await user.click(screen.getByRole('button', { name: /details for Drone 1/i }))

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'Drone 1' })).toBeInTheDocument()
    expect(dialog.getByText(/motion sensor needs recalibrating/i)).toBeInTheDocument()
    expect(dialog.getByText('44%')).toBeInTheDocument()
    expect(dialog.getByText('41.2')).toBeInTheDocument()
    expect(dialog.getByText('1.4.2')).toBeInTheDocument()
  })

  it('shows a fault a Drone reported even when its Status is not Fault', async () => {
    const user = userEvent.setup()
    // Airborne reads as Flying ahead of the fault, and an Offline Drone keeps a fault
    // in its last known Telemetry. In both cases the fault is what a Teacher opened the
    // Drone to find, so it cannot be gated on the Status.
    board([
      aDroneState({
        id: 'a',
        name: 'Drone 1',
        status: 'Offline',
        stale: true,
        lastContact: GENERATED_AT - 600_000,
        telemetry: aTelemetry({
          fault: { code: 'MOTOR_STALL', description: 'A motor did not spin up' },
        }),
      }),
    ])

    await user.click(screen.getByRole('button', { name: /details for Drone 1/i }))

    expect(
      within(screen.getByRole('dialog')).getByText(/a motor did not spin up/i),
    ).toBeInTheDocument()
  })

  it('separates what a Teacher can fix from what they cannot', async () => {
    const user = userEvent.setup()
    board([aDroneState({ id: 'a', name: 'Drone 1', status: 'Not Ready' })])

    await user.click(screen.getByRole('button', { name: /details for Drone 1/i }))

    expect(
      within(screen.getByRole('dialog')).getByText(/put this right before the lesson/i),
    ).toBeInTheDocument()
  })

  it('returns to the Fleet immediately on closing', async () => {
    const user = userEvent.setup()
    board([aDroneState({ id: 'a', name: 'Drone 1' })])

    await user.click(screen.getByRole('button', { name: /details for Drone 1/i }))
    await user.click(screen.getByRole('button', { name: /back to the Fleet/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(tile('Drone 1')).toBeInTheDocument()
  })

  it('closes on Escape, so nobody is stuck in a sub-screen', async () => {
    const user = userEvent.setup()
    board([aDroneState({ id: 'a', name: 'Drone 1' })])

    await user.click(screen.getByRole('button', { name: /details for Drone 1/i }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('warns that an Offline Drone detail is last known rather than current', async () => {
    const user = userEvent.setup()
    board([
      aDroneState({
        id: 'a',
        name: 'Drone 1',
        status: 'Offline',
        stale: true,
        lastContact: GENERATED_AT - 300_000,
      }),
    ])

    await user.click(screen.getByRole('button', { name: /details for Drone 1/i }))

    expect(
      within(screen.getByRole('dialog')).getByText(/last known values, not current/i),
    ).toBeInTheDocument()
  })
})

describe('reaching the board by keyboard', () => {
  it('lets a Teacher tab to a Drone and open it without a mouse', async () => {
    const user = userEvent.setup()
    board([aDroneState({ id: 'a', name: 'Drone 1' })])

    await user.tab()
    expect(screen.getByRole('button', { name: /details for Drone 1/i })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('before the first Fleet State arrives', () => {
  it('says it is connecting rather than showing an empty Fleet', () => {
    render(
      <FleetBoard
        snapshot={{ connection: 'connecting', state: null, receivedAt: null }}
        now={GENERATED_AT}
      />,
    )

    expect(
      screen.getByRole('status', { name: /ground station connection/i }),
    ).toHaveTextContent(/connecting to the ground station/i)
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })
})
