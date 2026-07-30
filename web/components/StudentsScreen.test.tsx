import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { assignStudent, clearLogbook, readLogbook, saveRoll, upsertStudent } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { StudentsScreen } from './StudentsScreen'

const pathname = vi.hoisted(() => ({ current: '/demo' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

const show = () => {
  const rendered = render(
    <FleetProvider demonstration={PINNED_DEMONSTRATION}>
      <StudentsScreen />
    </FleetProvider>,
  )
  act(() => {
    vi.advanceTimersByTime(2_000)
  })
  return rendered
}

beforeEach(() => {
  clearLogbook()
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the class', () => {
  it('says Student records save on this laptop first, with optional Vercel copy', () => {
    show()

    expect(screen.getByRole('note')).toHaveTextContent(/this browser on this laptop/)
    expect(screen.getByRole('note')).toHaveTextContent(/copy also goes to Vercel/)
    expect(screen.getByRole('note')).toHaveTextContent(/Students/)
    expect(screen.getByRole('note')).toHaveTextContent(/Settings/)
    expect(screen.getByRole('note')).toHaveTextContent(/Lesson/)
    expect(screen.getByRole('note')).toHaveTextContent(/Reports/)
  })

  it('keeps names so a class is typed once', () => {
    saveRoll(['Priya', 'Ravi'])
    show()

    expect(screen.getByText('Priya')).toBeInTheDocument()
    expect(screen.getByText('Ravi')).toBeInTheDocument()
  })

  it('adds a Student by name and assigns an S- id', () => {
    show()

    fireEvent.change(screen.getByLabelText(/^Name$/i), { target: { value: 'Amara' } })
    fireEvent.click(screen.getByRole('button', { name: /^Add$/ }))

    expect(screen.queryByLabelText(/^Student ID$/i)).not.toBeInTheDocument()
    expect(readLogbook().roster).toEqual([{ studentId: 'S-0001', name: 'Amara' }])
    expect(readLogbook().roll).toEqual(['Amara'])
    expect(screen.getByText('S-0001')).toBeInTheDocument()
  })

  it('removes one', () => {
    upsertStudent('yr8-priya', 'Priya')
    upsertStudent('yr8-ravi', 'Ravi')
    show()

    fireEvent.click(screen.getByRole('button', { name: /Remove Priya from the class/i }))

    expect(readLogbook().roster).toEqual([{ studentId: 'yr8-ravi', name: 'Ravi' }])
  })
})

describe('who is flying what', () => {
  it('says nobody has one yet, rather than showing an empty list', () => {
    show()

    expect(screen.getByText(/No Drone is assigned/i)).toBeInTheDocument()
  })

  it('shows the Student, the Drone and what the Drone is doing', () => {
    assignStudent('ttf-0001', 'Priya')
    show()

    expect(screen.getByRole('link', { name: 'Drone 1' })).toBeInTheDocument()
    // Name appears on Flying now and again in The class once assign migrates the roster.
    expect(screen.getAllByText('Priya').length).toBeGreaterThanOrEqual(1)
  })

  it('clears everyone at the end of a lesson', () => {
    assignStudent('ttf-0001', 'Priya')
    show()

    fireEvent.click(screen.getByRole('button', { name: /Everyone has put theirs down/i }))

    expect(readLogbook().students).toEqual({})
  })
})

/**
 * The design principle, guarded rather than agreed. A Drone that faulted did not fault
 * because of whose hands were on the controller, and a system that quietly builds a
 * failure history against a named child is not something to add as a side effect.
 */
describe('what this screen does not record', () => {
  it('says nothing about incidents, faults or anything else against a Student', () => {
    assignStudent('ttf-0001', 'Priya')
    saveRoll(['Priya'])
    show()

    for (const forbidden of [/incident/i, /fault(s|ed)/i, /history/i]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
    }
  })
})
