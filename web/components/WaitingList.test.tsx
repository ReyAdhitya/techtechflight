import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import {
  assignStudent,
  clearLogbook,
  readLogbook,
  registerStudent,
} from '@/lib/logbook'
import { WaitingList } from './WaitingList'

beforeEach(() => {
  clearLogbook()
})

afterEach(() => {
  clearLogbook()
})

describe('WaitingList', () => {
  it('renders unassigned Students in order and marks who is next', () => {
    registerStudent('Ada')
    registerStudent('Bea')
    registerStudent('Cal')
    assignStudent('ttf-0001', 'Bea')

    render(<WaitingList book={readLogbook()} />)

    expect(screen.getByRole('heading', { name: 'Waiting to fly' })).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => element?.textContent === '2 waiting'),
    ).toBeInTheDocument()

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText('Ada')).toBeInTheDocument()
    expect(within(items[0]!).getByText('Next')).toBeInTheDocument()
    expect(within(items[1]!).getByText('Cal')).toBeInTheDocument()
  })

  it('explains itself when nobody is waiting, with the count at zero', () => {
    registerStudent('Ada')
    assignStudent('ttf-0001', 'Ada')

    render(<WaitingList book={readLogbook()} />)

    expect(
      screen.getByText((_, element) => element?.textContent === '0 waiting'),
    ).toBeInTheDocument()
    expect(screen.getByText(/Nobody is waiting/)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
