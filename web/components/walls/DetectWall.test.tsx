import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FleetProvider } from '@/components/FleetProvider'
import type { ObjectDetector } from '@/lib/object-detection'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { DetectWall } from './DetectWall'
import { WallsShell } from './WallsShell'
import {
  DETECTION_COUNT_UNAVAILABLE,
  detectionCountFromDetections,
  formatDetectionCount,
  hasReadyPixelSource,
} from './detect-wall'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

beforeEach(() => {
  pathname.current = '/demo'
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('detect-wall helpers', () => {
  it('never turns a missing measurement into zero', () => {
    expect(detectionCountFromDetections([], false)).toBeNull()
    expect(formatDetectionCount(null)).toBe(DETECTION_COUNT_UNAVAILABLE)
    expect(detectionCountFromDetections([], true)).toBe(0)
    expect(formatDetectionCount(0)).toBe('0')
  })

  it('requires a video with dimensions before pixels count as ready', () => {
    const video = document.createElement('video')
    expect(hasReadyPixelSource(undefined)).toBe(false)
    expect(hasReadyPixelSource(video)).toBe(false)
    Object.defineProperty(video, 'readyState', { value: 4, configurable: true })
    Object.defineProperty(video, 'videoWidth', { value: 640, configurable: true })
    Object.defineProperty(video, 'videoHeight', { value: 480, configurable: true })
    expect(hasReadyPixelSource(video)).toBe(true)
  })
})

describe('DetectWall', () => {
  it('renders detection placeholders for each Fleet Drone', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <WallsShell title="Detect">
          <DetectWall />
        </WallsShell>
      </FleetProvider>,
    )
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(screen.getByRole('heading', { name: 'Detect' })).toBeInTheDocument()
    expect(screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/drone?id=')).length).toBeGreaterThan(
      0,
    )
  })

  it('says cannot count on idle cameras rather than showing a measured zero', () => {
    render(
      <FleetProvider demonstration={PINNED_DEMONSTRATION}>
        <DetectWall
          detector={{
            displayName: 'Test',
            demo: true,
            detect: vi.fn(async () => []),
          }}
        />
      </FleetProvider>,
    )
    act(() => {
      vi.advanceTimersByTime(2_000)
    })

    expect(screen.getAllByText(DETECTION_COUNT_UNAVAILABLE).length).toBeGreaterThan(0)
  })
})
