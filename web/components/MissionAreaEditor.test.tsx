import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { enclosesAnything, type Zone } from '@/lib/airspace'
import { MissionAreaEditor } from './MissionAreaEditor'

function Harness({ initial = [] as readonly Zone[] }: { readonly initial?: readonly Zone[] }) {
  const [zones, setZones] = useState<readonly Zone[]>(initial)
  return <MissionAreaEditor zones={zones} onChange={setZones} />
}

async function addPoint(user: ReturnType<typeof userEvent.setup>, east: string, north: string) {
  await user.clear(screen.getByLabelText(/^East$/i))
  await user.type(screen.getByLabelText(/^East$/i), east)
  await user.clear(screen.getByLabelText(/^North$/i))
  await user.type(screen.getByLabelText(/^North$/i), north)
  await user.click(screen.getByRole('button', { name: 'Add point' }))
}

describe('Mission area editor', () => {
  it('tells a Teacher what to do when nothing is drawn yet, and shows the grid to do it on', () => {
    render(<Harness />)

    expect(screen.getByTestId('mission-area-empty')).toBeInTheDocument()
    expect(screen.getByText(/outline where this Mission happens/i)).toBeInTheDocument()
    expect(screen.getByText(/at least three points/i)).toBeInTheDocument()
    // "Tap the grid" needs a grid. It used to be swapped out for the sentence, so the only
    // way into an empty editor was to type two numbers.
    expect(screen.getByRole('img', { name: /drawing surface/i })).toBeInTheDocument()
  })

  it('keeps typing points open while the Mission Zone is still being drawn', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await addPoint(user, '0', '0')
    await addPoint(user, '8', '0')
    await addPoint(user, '8', '6')

    // Three points enclose an area, but they are not the most a classroom needs — and
    // tapping the grid would still add a fourth, so typing one must work too.
    expect(screen.getByRole('button', { name: 'Add point' })).toBeEnabled()
    await addPoint(user, '0', '6')
    expect(screen.getByRole('listitem')).toHaveTextContent('4 points')
  })

  it('closes the Mission Zone to further points once it is finished', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await addPoint(user, '0', '0')
    await addPoint(user, '8', '0')
    await addPoint(user, '8', '6')
    await user.click(screen.getByRole('button', { name: 'Finish zone' }))

    expect(screen.getByRole('button', { name: 'Add point' })).toBeDisabled()
  })

  it('draws one Mission Zone through onChange', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await addPoint(user, '0', '0')
    await addPoint(user, '8', '0')
    await addPoint(user, '8', '6')

    expect(screen.getByRole('listitem')).toHaveTextContent('Mission Zone')
    expect(screen.getByRole('listitem')).toHaveTextContent('3 points')
    expect(screen.queryByTestId('mission-area-empty')).not.toBeInTheDocument()
    expect(document.querySelector('[data-zone-kind="mission"]')).toBeInTheDocument()
  })

  it('allows any number of No-fly Zones', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Draw No-fly Zone' }))
    await addPoint(user, '2', '2')
    await addPoint(user, '4', '2')
    await addPoint(user, '4', '4')
    await user.click(screen.getByRole('button', { name: 'Finish zone' }))

    await user.click(screen.getByRole('button', { name: 'Draw No-fly Zone' }))
    await addPoint(user, '10', '10')
    await addPoint(user, '12', '10')
    await addPoint(user, '12', '12')

    expect(screen.getByText(/No-fly Zone 1/)).toBeInTheDocument()
    expect(screen.getByText(/No-fly Zone 2/)).toBeInTheDocument()
    expect(document.querySelectorAll('[data-zone-kind="no-fly"]')).toHaveLength(2)
  })

  it('allows only one Mission Zone', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await addPoint(user, '0', '0')
    await addPoint(user, '6', '0')
    await addPoint(user, '6', '6')

    const missionButton = screen.getByRole('button', { name: 'Draw Mission Zone' })
    expect(missionButton).toBeDisabled()
    expect(screen.getAllByText(/Mission Zone/).length).toBeGreaterThanOrEqual(1)
  })

  it('undoes the last point while a zone is open', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await addPoint(user, '1', '1')
    await addPoint(user, '3', '1')
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByRole('listitem')).toHaveTextContent('1 point')
  })

  it('undoes the last zone when its final point is removed', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await addPoint(user, '2', '2')
    await user.click(screen.getByRole('button', { name: 'Undo' }))

    expect(screen.getByTestId('mission-area-empty')).toBeInTheDocument()
  })

  it('undoes a finished zone one point at a time when nothing is actively being drawn', async () => {
    const user = userEvent.setup()
    const existing: Zone = {
      id: 'nf-1',
      kind: 'no-fly',
      name: 'the netting',
      points: [
        { eastM: 1, northM: 1 },
        { eastM: 3, northM: 1 },
        { eastM: 3, northM: 3 },
      ],
    }
    render(<Harness initial={[existing]} />)

    expect(enclosesAnything(existing)).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('listitem')).toHaveTextContent('2 points')

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByRole('listitem')).toHaveTextContent('1 point')

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByTestId('mission-area-empty')).toBeInTheDocument()
  })
})
