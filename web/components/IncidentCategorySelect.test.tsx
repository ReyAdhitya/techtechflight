import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { IncidentCategorySelect } from './IncidentCategorySelect'
import { INCIDENT_CATEGORIES } from '@/lib/incident-categories'

describe('IncidentCategorySelect', () => {
  it('offers the fixed vocabulary and reports the chosen id', () => {
    const onChange = vi.fn()
    render(<IncidentCategorySelect value="" onChange={onChange} />)

    const select = screen.getByLabelText('Category')
    expect(select).toBeTruthy()
    for (const entry of INCIDENT_CATEGORIES) {
      expect(screen.getByRole('option', { name: entry.label })).toBeTruthy()
    }

    fireEvent.change(select, { target: { value: 'battery' } })
    expect(onChange).toHaveBeenCalledWith('battery')
  })

  it('can clear back to Uncategorised', () => {
    const onChange = vi.fn()
    render(<IncidentCategorySelect value="link" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith('')
  })
})
