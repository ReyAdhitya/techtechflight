import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { LostLinkSiren } from './LostLinkSiren'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('LostLinkSiren', () => {
  it('stays silent on a healthy settled demonstration Fleet', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <LostLinkSiren />
      </FleetProvider>,
    )
    settle()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('uses motion-safe pulse on the siren class when shown', () => {
    // Structural invariant: the component always includes motion-safe:animate-pulse
    // so reduced-motion users do not get a compulsory pulse (Tailwind motion-safe).
    expect(LostLinkSiren.toString()).toBeTruthy()
    const source = require('fs').readFileSync(
      require('path').join(__dirname, 'LostLinkSiren.tsx'),
      'utf8',
    ) as string
    expect(source).toMatch(/motion-safe:animate-pulse/)
    expect(source).toMatch(/role="alert"/)
  })
})
