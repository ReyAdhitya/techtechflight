import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook } from '@/lib/logbook'
import { assignDroneToTeam, createTeam, readTeams } from '@/lib/teams'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { LessonScreen } from './LessonScreen'

/**
 * Mission prep on the Lesson screen (#541) — Scenario through team briefs in workflow
 * order, each with a next-step hint.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

const screenUnderTest = () =>
  render(
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>
      <LessonScreen />
    </FleetProvider>,
  )

/** Three corners of a Mission Zone on the 20 m grid (via coordinate inputs). */
function drawMissionZone() {
  const east = screen.getByLabelText('East')
  const north = screen.getByLabelText('North')
  const add = screen.getByRole('button', { name: 'Add point' })

  fireEvent.change(east, { target: { value: '2' } })
  fireEvent.change(north, { target: { value: '2' } })
  fireEvent.click(add)
  fireEvent.change(east, { target: { value: '12' } })
  fireEvent.change(north, { target: { value: '2' } })
  fireEvent.click(add)
  fireEvent.change(east, { target: { value: '12' } })
  fireEvent.change(north, { target: { value: '12' } })
  fireEvent.click(add)
}

beforeEach(() => {
  clearLogbook()
  window.localStorage.removeItem('techtechflight:teams')
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  window.localStorage.removeItem('techtechflight:teams')
})

describe('mission prep on the Lesson screen', () => {
  it('shows Scenario first with a hint toward drawing the area', () => {
    screenUnderTest()
    settle()

    expect(screen.getByRole('heading', { name: 'Mission prep' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mission Scenario' })).toBeInTheDocument()
    expect(screen.getByText(/Draw the Mission area and any no-fly zones/i)).toBeInTheDocument()
  })

  it('reveals area, teams, pre-flight, briefing and print in workflow order', () => {
    createTeam('Red Team')
    const teamId = readTeams()[0]!.id
    assignDroneToTeam(teamId, 'ttf-0001')
    screenUnderTest()
    settle()

    fireEvent.click(screen.getByRole('button', { name: /Search and Rescue/i }))

    expect(screen.getByRole('heading', { name: 'Mission area' })).toBeInTheDocument()
    expect(screen.getByText(/Assign each team to a craft/i)).toBeInTheDocument()

    drawMissionZone()

    expect(screen.getByRole('heading', { name: 'Mission teams' })).toBeInTheDocument()
    expect(screen.getByText(/Tick each craft’s pre-flight check/i)).toBeInTheDocument()

    expect(screen.getByText(/Propellers is the only one you tick/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Walk the class through the Mission rules and safety brief/i),
    ).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: 'Mission rules and safety briefing' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Print a team brief for each group/i)).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Team briefs to print' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Team brief: Red Team/i)).toBeInTheDocument()
  })

  it('keeps the Ready wall pre-flight summary distinct until teams unlock craft checks', () => {
    screenUnderTest()
    settle()

    expect(screen.getByRole('heading', { name: 'Pre-flight check' })).toBeInTheDocument()
    expect(screen.queryByText(/Propellers is the only one you tick/i)).not.toBeInTheDocument()
  })
})
