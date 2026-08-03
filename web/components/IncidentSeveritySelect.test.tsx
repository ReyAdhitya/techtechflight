import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IncidentSeveritySelect } from './IncidentSeveritySelect'
import { formatIncidentSeverity } from '@/lib/incident-severity'

describe('incident severity select', () => {
  it('offers only the fixed severities', () => {
    render(<IncidentSeveritySelect onChange={() => {}} />)
    const options = screen.getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['Needs attention', 'Fault'])
    expect(options.map((option) => (option as HTMLOptionElement).value)).toEqual([
      'attention',
      'fault',
    ])
  })

  it('reports the chosen fixed code, never free text', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IncidentSeveritySelect value="attention" onChange={onChange} />)

    await user.selectOptions(screen.getByLabelText('Severity'), 'fault')
    expect(onChange).toHaveBeenCalledWith('fault')
  })

  it('keeps a legacy free-text severity readable on Reports', () => {
    expect(formatIncidentSeverity('bumped a chair')).toBe('bumped a chair')
  })
})
