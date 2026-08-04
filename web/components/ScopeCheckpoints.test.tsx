import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { aDroneState, aTelemetry } from '@techtechflight/contract/fixtures'
import type { MissionCheckpoint } from '@/lib/mission'
import { scopeWindow } from './Scope'
import { ScopeCheckpoints } from './ScopeCheckpoints'

const checkpoint = (
  id: string,
  name: string,
  eastM: number,
  northM: number,
  required = true,
): MissionCheckpoint => ({
  id,
  name,
  at: { eastM, northM },
  radiusM: 1,
  required,
})

const at = (name: string, eastM: number, northM: number) =>
  aDroneState({
    id: name.toLowerCase().replace(' ', '-'),
    name,
    status: 'Flying',
    telemetry: aTelemetry({ airborne: true, position: { eastM, northM } }),
  })

function renderOverlay(
  checkpoints: readonly MissionCheckpoint[],
  reachedIds: ReadonlySet<string>,
  view: 'top-down' | 'side' | 'front' = 'top-down',
) {
  const scope = scopeWindow(checkpoints.map((cp) => at('Drone', cp.at.eastM, cp.at.northM)))
  return render(
    <svg viewBox={`0 0 ${scope.widthM} ${scope.heightM}`}>
      <ScopeCheckpoints
        checkpoints={checkpoints}
        reachedIds={reachedIds}
        project={scope.project}
        view={view}
      />
    </svg>,
  )
}

describe('Scope checkpoints overlay', () => {
  it('draws nothing on elevation views', () => {
    const checkpoints = [checkpoint('a', 'Alpha', 2, 2)]
    const { container } = renderOverlay(checkpoints, new Set(), 'side')

    expect(container.querySelector('[data-scope-checkpoints]')).toBeNull()
  })

  it('draws nothing when there are no checkpoints', () => {
    const scope = scopeWindow([at('Drone 1', 0, 0)])
    const { container } = render(
      <svg viewBox={`0 0 ${scope.widthM} ${scope.heightM}`}>
        <ScopeCheckpoints
          checkpoints={[]}
          reachedIds={new Set()}
          project={scope.project}
          view="top-down"
        />
      </svg>,
    )

    expect(container.querySelector('[data-scope-checkpoints]')).toBeNull()
  })

  it('keeps checkpoint order fixed when reach state changes', () => {
    const checkpoints = [
      checkpoint('a', 'Alpha', 2, 2),
      checkpoint('b', 'Bravo', 6, 6),
      checkpoint('c', 'Charlie', 10, 2),
    ]

    const { container, rerender } = renderOverlay(checkpoints, new Set(['a']))
    const ordersBefore = [...container.querySelectorAll('[data-checkpoint-order]')].map((node) =>
      node.getAttribute('data-checkpoint-order'),
    )
    expect(ordersBefore).toEqual(['1', '2', '3'])

    const scope = scopeWindow(checkpoints.map((cp) => at('Drone', cp.at.eastM, cp.at.northM)))
    rerender(
      <svg viewBox={`0 0 ${scope.widthM} ${scope.heightM}`}>
        <ScopeCheckpoints
          checkpoints={checkpoints}
          reachedIds={new Set(['a', 'b'])}
          project={scope.project}
          view="top-down"
        />
      </svg>,
    )

    const ordersAfter = [...container.querySelectorAll('[data-checkpoint-order]')].map((node) =>
      node.getAttribute('data-checkpoint-order'),
    )
    expect(ordersAfter).toEqual(['1', '2', '3'])
    expect([...container.querySelectorAll('[data-checkpoint-id]')].map((node) => node.getAttribute('data-checkpoint-id'))).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('distinguishes reached checkpoints by shape as well as colour', () => {
    const checkpoints = [
      checkpoint('a', 'Alpha', 2, 2),
      checkpoint('b', 'Bravo', 8, 8),
    ]
    const { container } = renderOverlay(checkpoints, new Set(['a']))

    const reached = container.querySelector('[data-checkpoint-id="a"]')
    const pending = container.querySelector('[data-checkpoint-id="b"]')

    expect(reached?.querySelector('[data-shape="filled"]')).toBeInTheDocument()
    expect(reached?.querySelector('[data-shape="diamond"]')).toBeNull()
    expect(reached).toHaveAttribute('data-reached', 'true')

    expect(pending?.querySelector('[data-shape="diamond"]')).toBeInTheDocument()
    expect(pending?.querySelector('[data-shape="filled"]')).toBeNull()
    expect(pending).toHaveAttribute('data-reached', 'false')
  })

  it('names every checkpoint in words, not colour alone', () => {
    const checkpoints = [
      checkpoint('a', 'Alpha', 2, 2),
      checkpoint('b', 'Bravo', 8, 8, false),
    ]
    renderOverlay(checkpoints, new Set(['a']))

    expect(screen.getByRole('img', { name: 'Checkpoint 1, Alpha: reached' })).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Checkpoint 2, Bravo: not reached, optional' }),
    ).toBeInTheDocument()
  })

  it('connects checkpoints with a route in mission order', () => {
    const checkpoints = [
      checkpoint('a', 'Alpha', 2, 2),
      checkpoint('b', 'Bravo', 8, 8),
    ]
    const { container } = renderOverlay(checkpoints, new Set())

    const route = container.querySelector('[data-checkpoint-route]')
    expect(route).toBeInTheDocument()
    expect(route?.getAttribute('points')).toMatch(/\d/)
  })

  it('labels reach state beside the order number', () => {
    const checkpoints = [checkpoint('a', 'Alpha', 4, 4)]
    const { container } = renderOverlay(checkpoints, new Set(['a']))

    expect(container.querySelector('[data-checkpoint-label]')?.textContent).toBe('1. reached')
  })
})
