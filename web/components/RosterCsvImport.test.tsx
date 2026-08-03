import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook, readLogbook, registerStudent } from '@/lib/logbook'
import { RosterCsvImport } from './RosterCsvImport'

beforeEach(() => {
  clearLogbook()
})

describe('RosterCsvImport', () => {
  it('imports a valid paste into the Logbook', () => {
    render(<RosterCsvImport />)
    fireEvent.change(screen.getByLabelText('Paste roster CSV'), {
      target: { value: 'name\nAmara\nPriya\n' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Import paste' }))
    expect(screen.getByRole('status').textContent).toMatch(/Imported 2/)
    expect(readLogbook().roster.map((student) => student.name)).toEqual(['Amara', 'Priya'])
  })

  it('leaves the Logbook alone when the paste is malformed and says why', () => {
    registerStudent('Ravi')
    render(<RosterCsvImport />)
    fireEvent.change(screen.getByLabelText('Paste roster CSV'), {
      target: { value: 'name\nAmara\nAmara\n' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Import paste' }))
    expect(screen.getByRole('alert').textContent).toMatch(/twice/)
    expect(readLogbook().roster.map((student) => student.name)).toEqual(['Ravi'])
  })

  it('opens the file picker from Choose CSV', () => {
    render(<RosterCsvImport />)
    const input = screen.getByLabelText('Choose roster CSV file') as HTMLInputElement
    const click = vi.spyOn(input, 'click')
    fireEvent.click(screen.getByRole('button', { name: 'Choose CSV' }))
    expect(click).toHaveBeenCalled()
  })
})
