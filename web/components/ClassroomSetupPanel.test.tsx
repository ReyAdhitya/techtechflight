import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { clearLogbook } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { ClassroomSetupPanel } from './ClassroomSetupPanel'
import { SettingsScreen } from './SettingsScreen'
import { putClassroomSetup } from '@/lib/classroom-setup'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

const show = (node: React.ReactNode) =>
  render(<FleetProvider demonstration={PINNED_DEMONSTRATION}>{node}</FleetProvider>)

beforeEach(() => {
  clearLogbook()
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Classroom setup on Settings', () => {
  it('explains Simulator, School drones and Radio without pretending hardware is live', () => {
    show(<ClassroomSetupPanel />)
    settle()

    expect(screen.getByText('Classroom setup')).toBeInTheDocument()
    expect(screen.getByText(/School drones listen on this Wi-Fi/)).toBeInTheDocument()
    expect(screen.getByText(/MAVLink/)).toBeInTheDocument()
    expect(screen.getByText(/watch-only/)).toBeInTheDocument()
    expect(screen.getByText(/Demonstration Fleet/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Simulator' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'School drones (Wi-Fi)' }),
    ).not.toBeInTheDocument()
  })

  it('sits on Settings above the ground-station panel', () => {
    show(<SettingsScreen />)
    settle()

    expect(screen.getByText('Classroom setup')).toBeInTheDocument()
    expect(screen.getByText('The ground station')).toBeInTheDocument()
  })
})

describe('saving a Classroom path preference', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { source: string }
        return Response.json({
          active: 'simulator',
          preferred: body.source,
          restartRequired: body.source !== 'simulator',
          commands: 'available',
        })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('records School drones as next launch and asks for a restart', async () => {
    const result = await putClassroomSetup('http://localhost:4321', 'esp')
    expect(result?.preferred).toBe('esp')
    expect(result?.restartRequired).toBe(true)
    expect(result?.active).toBe('simulator')
  })

  it('records Radio as next launch and asks for a restart', async () => {
    const result = await putClassroomSetup('http://localhost:4321', 'mavlink')
    expect(result?.preferred).toBe('mavlink')
    expect(result?.restartRequired).toBe(true)
    expect(result?.active).toBe('simulator')
  })
})
