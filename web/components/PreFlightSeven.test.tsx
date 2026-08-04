import { aTelemetry } from '@techtechflight/contract/fixtures'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PRE_FLIGHT_SEVEN_ITEMS, PRE_FLIGHT_SEVEN_KEY } from '@/lib/preflight-seven'
import { PreFlightSeven } from './PreFlightSeven'

beforeEach(() => {
  window.localStorage.removeItem(PRE_FLIGHT_SEVEN_KEY)
})

afterEach(() => {
  window.localStorage.removeItem(PRE_FLIGHT_SEVEN_KEY)
})

const fullTelemetry = aTelemetry({
  batteryFraction: 0.82,
  orientation: { pitchDegrees: 0, rollDegrees: 0, yawDegrees: 0 },
  camera: { streaming: true },
  proximity: null,
  linkQuality: 0.85,
  extra: { altitudeHold: true },
})

describe('PreFlightSeven', () => {
  it('renders seven fixed rows with zero OK when nothing has passed yet', () => {
    render(
      <PreFlightSeven
        droneId="ttf-0001"
        lessonId="lesson-1"
        telemetry={null}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Pre-flight check' })).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === `0 of ${PRE_FLIGHT_SEVEN_ITEMS.length} OK`),
    ).toBeInTheDocument()

    for (const item of PRE_FLIGHT_SEVEN_ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: /propellers/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('ticks propellers with word and pressed state, and resets when the Lesson changes', () => {
    const { rerender } = render(
      <PreFlightSeven
        droneId="ttf-0001"
        lessonId="lesson-1"
        telemetry={fullTelemetry}
      />,
    )

    expect(
      screen.getByText((_, element) => element?.textContent === `6 of ${PRE_FLIGHT_SEVEN_ITEMS.length} OK`),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /propellers/i }))
    expect(screen.getByRole('button', { name: /propellers/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByText((_, element) => element?.textContent === `${PRE_FLIGHT_SEVEN_ITEMS.length} of ${PRE_FLIGHT_SEVEN_ITEMS.length} OK`),
    ).toBeInTheDocument()

    rerender(
      <PreFlightSeven
        droneId="ttf-0001"
        lessonId="lesson-2"
        telemetry={fullTelemetry}
      />,
    )
    expect(
      screen.getByText((_, element) => element?.textContent === `6 of ${PRE_FLIGHT_SEVEN_ITEMS.length} OK`),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /propellers/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('says cannot report for Telemetry items the airframe omits', () => {
    render(
      <PreFlightSeven
        droneId="ttf-0005"
        lessonId="lesson-1"
        telemetry={aTelemetry({
          batteryFraction: 0.94,
          orientation: { pitchDegrees: 0, rollDegrees: 0, yawDegrees: 0 },
        })}
      />,
    )

    expect(screen.getAllByText('Cannot report').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText(/no camera fitted/i)).toBeInTheDocument()
    expect(screen.getByText(/cannot report altitude hold/i)).toBeInTheDocument()
  })
})
