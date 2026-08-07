import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MissionStepForward } from './MissionStepForward'

const replace = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => '/lesson',
}))

/**
 * The three old destinations, and why they still answer.
 *
 * A Teacher has `/control` bookmarked, a poster prints `/lesson`, and a 404 in front of a
 * class is worse than any amount of forwarding. What matters here is that the page says
 * where it is going as well as going there: `router.replace` needs JavaScript, and this is
 * a static export that is served off a memory stick as often as off Vercel.
 */
describe('an old destination', () => {
  it('forwards to the step that answers it', () => {
    replace.mockClear()
    render(<MissionStepForward step={6} what="The Flight Control Center" />)

    expect(replace).toHaveBeenCalledWith('/mission?step=6')
  })

  it('says where it is going, for a browser that did not run the redirect', () => {
    replace.mockClear()
    render(<MissionStepForward step={12} what="Logs, scores and the debrief" />)

    expect(
      screen.getByText(/Logs, scores and the debrief is step 12 of the Mission run now\./),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Go to step 12/ })).toHaveAttribute(
      'href',
      '/mission?step=12',
    )
  })

  it('keeps the one main the skip link lands on', () => {
    replace.mockClear()
    render(<MissionStepForward step={1} what="Setting the Mission up" />)

    expect(document.querySelectorAll('#content')).toHaveLength(1)
  })
})
