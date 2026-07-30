import { describe, expect, it } from 'vitest'
import { aDroneState, aTelemetry } from '@techtechflight/contract/fixtures'
import {
  ghostPathsAvailable,
  recordGhostPaths,
  type GhostPathStore,
} from './scope-ghost-paths'

const drone = (id: string, eastM: number, northM: number) =>
  aDroneState({
    id,
    name: id,
    status: 'Flying',
    telemetry: aTelemetry({ airborne: true, position: { eastM, northM } }),
  })

describe('recordGhostPaths', () => {
  it('builds a trail when a Drone moves', () => {
    let store: GhostPathStore = new Map()
    store = recordGhostPaths(store, [drone('a', 0, 0)], 0)
    store = recordGhostPaths(store, [drone('a', 1, 0)], 1000)
    store = recordGhostPaths(store, [drone('a', 2, 0)], 2000)
    expect(store.get('a')).toHaveLength(3)
    expect(ghostPathsAvailable(store)).toBe(true)
  })

  it('drops samples outside the time window', () => {
    let store: GhostPathStore = new Map()
    store = recordGhostPaths(store, [drone('a', 0, 0)], 0)
    store = recordGhostPaths(store, [drone('a', 5, 0)], 200_000)
    expect(store.get('a')).toHaveLength(1)
  })

  it('reports unavailable when nothing has moved yet', () => {
    let store: GhostPathStore = new Map()
    store = recordGhostPaths(store, [drone('a', 0, 0)], 0)
    store = recordGhostPaths(store, [drone('a', 0, 0)], 100)
    expect(ghostPathsAvailable(store)).toBe(false)
  })
})
