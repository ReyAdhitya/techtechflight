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
    expect(screen.getByText(/areas Drones must stay out of/i)).toBeInTheDocument()
    expect(screen.getByText(/at least three points/i)).toBeInTheDocument()
    // "Tap the grid" needs a grid. It used to be swapped out for the sentence, so the only
    // way into an empty editor was to type two numbers.
    expect(screen.getByRole('img', { name: /drawing surface/i })).toBeInTheDocument()
  })

  it('keeps typing points open while a zone is still being drawn', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await addPoint(user, '-3', '-2')
    await addPoint(user, '3', '-2')
    await addPoint(user, '3', '2')

    // Three points enclose an area, but they are not the most a classroom needs — and
    // tapping the grid would still add a fourth, so typing one must work too.
    expect(screen.getByRole('button', { name: 'Add point' })).toBeEnabled()
    await addPoint(user, '-3', '2')
    expect(screen.getByRole('listitem')).toHaveTextContent('4 points')
  })

  /*
   * Finish only stops the *current* shape. It used to disable Add point outright, because
   * one Mission Zone was the most a Teacher could have; with no go-area left (ADR-0027) the
   * next point starts the next No-fly Zone, and there is no limit on those.
   */
  it('starts a new zone after the last one is finished', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await addPoint(user, '-3', '-2')
    await addPoint(user, '3', '-2')
    await addPoint(user, '3', '2')
    await user.click(screen.getByRole('button', { name: 'Finish zone' }))

    expect(screen.getByRole('button', { name: 'Add point' })).toBeEnabled()
  })

  it('draws a No-fly Zone through onChange', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await addPoint(user, '-3', '-2')
    await addPoint(user, '3', '-2')
    await addPoint(user, '3', '2')

    expect(screen.getByRole('listitem')).toHaveTextContent('No-fly Zone 1')
    expect(screen.getByRole('listitem')).toHaveTextContent('3 points')
    expect(screen.queryByTestId('mission-area-empty')).not.toBeInTheDocument()
    expect(document.querySelector('[data-zone-kind="no-fly"]')).toBeInTheDocument()
  })

  it('allows any number of No-fly Zones', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await addPoint(user, '1', '1')
    await addPoint(user, '2', '1')
    await addPoint(user, '2', '2')
    await user.click(screen.getByRole('button', { name: 'Finish zone' }))

    await addPoint(user, '-3', '-2')
    await addPoint(user, '-1', '-2')
    await addPoint(user, '-1', '-1')

    expect(screen.getByText(/No-fly Zone 1/)).toBeInTheDocument()
    expect(screen.getByText(/No-fly Zone 2/)).toBeInTheDocument()
    expect(document.querySelectorAll('[data-zone-kind="no-fly"]')).toHaveLength(2)
  })

  /* One kind of zone left, so a mode to pick between kinds is chrome saying nothing. */
  it('offers no drawing mode to choose', async () => {
    render(<Harness />)

    expect(screen.queryByRole('button', { name: /Draw Mission Zone/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Draw No-fly Zone/ })).not.toBeInTheDocument()
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

/**
 * A zone the Teacher drew and the Scope will never show.
 *
 * The failure is not an ugly picture. A Teacher who cannot see a boundary stops believing
 * there is one, and watching it is the whole of what this feature is for.
 */
describe('a zone outside the picture the Scope draws', () => {
  const far: Zone = {
    id: 'far',
    kind: 'no-fly',
    name: 'The far corner',
    points: [
      { eastM: 15, northM: 15 },
      { eastM: 19, northM: 15 },
      { eastM: 19, northM: 19 },
    ],
  }
  const near: Zone = {
    id: 'near',
    kind: 'no-fly',
    name: 'Over the desks',
    points: [
      { eastM: 1, northM: 1 },
      { eastM: 4, northM: 1 },
      { eastM: 4, northM: 4 },
    ],
  }
  const window = { westM: 0, eastM: 8, southM: 0, northM: 8 }

  it('names it, and says where the picture actually reaches', () => {
    render(<MissionAreaEditor zones={[near, far]} onChange={() => {}} scopeSpace={window} />)

    const said = screen.getByRole('status').textContent ?? ''
    expect(said).toContain('The far corner')
    expect(said).not.toContain('Over the desks')
    expect(said).toContain('The Alert still fires')
  })

  it('says nothing when every zone is drawn where it can be seen', () => {
    render(<MissionAreaEditor zones={[near]} onChange={() => {}} scopeSpace={window} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  /*
   * With no Drone reporting a position there is still a space: the classroom boundary, which
   * is what this surface draws until the Scope has a window of its own. A zone outside *that*
   * is outside the picture on both screens, so it is named rather than waved through.
   *
   * This used to say nothing at all, on the argument that "outside" would be a guess. It was
   * not a guess; it was the whole room, and the guess was calling a twenty metre grid the
   * space a Teacher was drawing in.
   */
  it('names a zone outside the room even before the Scope has a window', () => {
    render(<MissionAreaEditor zones={[far]} onChange={() => {}} />)

    expect(screen.getByRole('status').textContent ?? '').toContain('The far corner')
  })

  it('says nothing about a zone drawn inside the room', () => {
    const inTheRoom: Zone = {
      id: 'in-the-room',
      kind: 'no-fly',
      name: 'Over the desks',
      points: [
        { eastM: -2, northM: -1 },
        { eastM: 1, northM: -1 },
        { eastM: 1, northM: 2 },
      ],
    }
    render(<MissionAreaEditor zones={[inTheRoom]} onChange={() => {}} />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

/**
 * The surface draws the space the Scope draws, and that is the whole of defect 5.
 *
 * It used to be a fixed twenty metres square running north-east from the origin, while the
 * Scope draws a window around where the Drones are: about eight metres by six, astride the
 * origin, half of it in negative metres this grid could not express. Every zone a Teacher drew
 * landed outside the picture. The rail said "2 no-fly zones" and the Scope's key named no
 * hatch, and neither was lying.
 */
describe('the space the surface draws', () => {
  const spaceOf = (container: HTMLElement) =>
    container.querySelector('svg[role="img"]')?.getAttribute('data-space')

  it('draws the classroom boundary when the Scope has no window yet', () => {
    const { container } = render(<MissionAreaEditor zones={[]} onChange={() => {}} />)

    expect(spaceOf(container)).toBe('-4,4,-3,3')
    expect(container.querySelector('[data-classroom-geofence]')).toBeInTheDocument()
  })

  it('follows the Scope window once there is one', () => {
    const { container } = render(
      <MissionAreaEditor
        zones={[]}
        onChange={() => {}}
        scopeSpace={{ westM: -8, eastM: 8, southM: -8, northM: 8 }}
      />,
    )

    expect(spaceOf(container)).toBe('-8,8,-8,8')
  })

  /* A Teacher typing a corner past the edge gets the edge, not a zone nobody will see. */
  it('holds a typed corner inside the space', async () => {
    const user = userEvent.setup()
    let latest: readonly Zone[] = []
    render(
      <MissionAreaEditor
        zones={[]}
        onChange={(next) => {
          latest = next
        }}
      />,
    )

    await addPoint(user, '40', '-40')

    expect(latest[0]?.points[0]).toEqual({ eastM: 4, northM: -3 })
  })

  /* And the room's own metres are said in words, because the grid cannot say them. */
  it('names the metres it covers', () => {
    render(<MissionAreaEditor zones={[]} onChange={() => {}} />)

    expect(screen.getByText(/The same space the Scope draws/)).toBeInTheDocument()
  })
})
