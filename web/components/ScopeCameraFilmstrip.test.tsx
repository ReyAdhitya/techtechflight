import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { FleetProvider, useFleet } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { ScopeCameraFilmstrip } from './ScopeCameraFilmstrip'
import { CameraSlide } from './CameraSlide'
import { useState } from 'react'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(3_000)
  })

function FilmstripHarness() {
  const { snapshot, vitals, scenarios } = useFleet()
  const [openId, setOpenId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const state = snapshot.state
  if (!state) return null
  const open = openId ? state.drones.find((d) => d.id === openId) : null

  return (
    <>
      <ScopeCameraFilmstrip
        vitals={vitals}
        drones={state.drones}
        scenarios={scenarios}
        selected={selected}
        onOpenCamera={(id) => {
          setSelected(id)
          setOpenId(id)
        }}
      />
      {open && (
        <CameraSlide
          droneId={open.id}
          droneName={open.name}
          camera={open.telemetry?.camera}
          scenarios={scenarios}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  )
}

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Scope camera filmstrip', () => {
  it('renders one thumb per Drone in board order', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <FilmstripHarness />
      </FleetProvider>,
    )
    settle()

    const filmstrip = screen.getByRole('list', { name: 'Camera filmstrip' })
    const thumbs = within(filmstrip).getAllByRole('button', { name: / camera$/i })
    expect(thumbs).toHaveLength(6)
    expect(thumbs.map((thumb) => thumb.getAttribute('aria-label'))).toEqual([
      'Drone 1 camera',
      'Drone 2 camera',
      'Drone 3 camera',
      'Drone 4 camera',
      'Drone 5 camera',
      'Drone 6 camera',
    ])
  })

  it('opens CameraSlide when a thumb is clicked', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <FilmstripHarness />
      </FleetProvider>,
    )
    settle()

    fireEvent.click(screen.getByRole('button', { name: 'Drone 2 camera' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('lights the thumb for the selected Drone', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <FilmstripHarness />
      </FleetProvider>,
    )
    settle()

    const thumb = screen.getByRole('button', { name: 'Drone 3 camera' })
    fireEvent.click(thumb)
    expect(thumb).toHaveAttribute('aria-pressed', 'true')
  })
})
