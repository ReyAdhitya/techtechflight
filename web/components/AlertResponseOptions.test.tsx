import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertResponseOptions } from './AlertResponseOptions'
import { playbookFor, PRIORITY_WORDS } from '@/lib/incident-playbook'

describe('AlertResponseOptions', () => {
  it('offers every playbook response for a no-fly Alert in safety-priority order', () => {
    const entry = playbookFor('no-fly')!
    render(<AlertResponseOptions kind="no-fly" onSelect={() => {}} />)

    expect(screen.getByRole('heading', { name: entry.title })).toBeInTheDocument()
    expect(screen.getByText(PRIORITY_WORDS[entry.priority])).toBeInTheDocument()

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(entry.responses.length)
    entry.responses.forEach((response, index) => {
      expect(buttons[index]).toHaveTextContent(response.label)
      expect(buttons[index]).toHaveTextContent(response.detail)
    })
  })

  it('marks the first response as recommended', () => {
    render(<AlertResponseOptions kind="no-fly" onSelect={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(within(buttons[0]!).getByText('Recommended')).toBeInTheDocument()
    expect(within(buttons[1]!).queryByText('Recommended')).not.toBeInTheDocument()
  })

  it('puts people safety before aircraft recovery on separation', () => {
    render(<AlertResponseOptions kind="separation" onSelect={() => {}} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]).toHaveTextContent('Hold position')
    expect(buttons[1]).toHaveTextContent('Instruct the team')
    expect(buttons[2]).toHaveTextContent('Land now')
  })

  it('names Commands so a Teacher knows which choices reach the simulated Fleet', () => {
    render(<AlertResponseOptions kind="no-fly" onSelect={() => {}} />)
    const recall = screen.getByRole('button', { name: /Recall/i })
    expect(recall).toHaveTextContent('Sends a Command to the simulated Fleet')
    expect(screen.getByRole('button', { name: /Instruct the team/i })).not.toHaveTextContent(
      'Sends a Command to the simulated Fleet',
    )
  })

  it('hands back the response that was pressed', async () => {
    const entry = playbookFor('no-fly')!
    const onSelect = vi.fn()
    render(<AlertResponseOptions kind="no-fly" onSelect={onSelect} />)

    await userEvent.click(screen.getByRole('button', { name: /Hold position/i }))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith(entry.responses[1], 1)
  })

  it('renders nothing when the playbook has no entry', () => {
    const { container } = render(
      <AlertResponseOptions kind={'not-a-kind' as 'no-fly'} onSelect={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
