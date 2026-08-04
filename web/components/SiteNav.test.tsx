import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DESTINATIONS, SiteNav } from './SiteNav'

const pathname = vi.hoisted(() => ({ current: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

/**
 * Six places, ordered by a Teacher's day.
 *
 * The count matters. Every destination added past what a Teacher actually visits is one
 * more thing to read past while looking for the one they wanted.
 */
describe('where a Teacher can go', () => {
  it('offers exactly the seven places, in the order of a Teacher day', () => {
    render(<SiteNav />)

    /*
     * Vision is last and is the odd one out — a check rather than a place in the day. It
     * is here at all because a check nobody can find is a check nobody runs, and it
     * answers a question no other screen can: whether this machine can see.
     */
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Control',
      'Walls',
      'Fleet',
      'Lesson',
      'Students',
      'Reports',
      'Vision',
    ])
  })

  it('does not offer Settings, which is not a place in the workflow', () => {
    render(<SiteNav />)

    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('does not offer the screens that were folded into others', () => {
    // History and Maintenance still exist as routes and still forward; they are simply no
    // longer somewhere a Teacher is invited to go mid-lesson.
    for (const gone of ['History', 'Maintenance', 'Tower']) {
      expect(screen.queryByRole('link', { name: gone })).not.toBeInTheDocument()
    }
  })

  it('marks the screen a Teacher is on', () => {
    pathname.current = '/reports'
    render(<SiteNav />)

    expect(screen.getByRole('link', { name: 'Reports' })).toHaveAttribute('aria-current', 'page')
  })

  it('marks Walls active on wall subroutes', () => {
    pathname.current = '/walls/cameras'
    render(<SiteNav />)

    expect(screen.getByRole('link', { name: 'Walls' })).toHaveAttribute('aria-current', 'page')
  })

  it('treats the demonstration board as the Fleet, because it is the same screen', () => {
    pathname.current = '/demo'
    render(<SiteNav />)

    expect(screen.getByRole('link', { name: 'Fleet' })).toHaveAttribute('aria-current', 'page')
  })

  it('every destination is a real route', () => {
    expect(DESTINATIONS.map((destination) => destination.href)).toEqual([
      '/control',
      '/walls',
      '/',
      '/lesson',
      '/students',
      '/reports',
      '/vision',
    ])
  })
})
