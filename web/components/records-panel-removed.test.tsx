import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook, readLogbook, runningLesson, startLesson, writeNote } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { LessonStrip } from './LessonStrip'
import { SettingsScreen } from './SettingsScreen'

/**
 * What Settings no longer offers, and the prompt that had to go with it.
 *
 * Export, Import and Clear everything are withdrawn, with the consequence accepted: a
 * Teacher's records stay in one browser profile with no route out and no way to clear them
 * short of clearing site data.
 *
 * The half of this that is easy to get wrong is not the deletion — it is the **orphan**. The
 * lesson strip used to warn, at the end of a lesson with a heavy logbook, that the records
 * were getting large, and offer a button to export them there and then. Deleting the Settings
 * panel and leaving that in place would tell a Teacher about a problem while removing every
 * remedy for it, which is worse than never mentioning it. This asserts the warning is gone
 * under the very condition that used to raise it.
 */

const pathname = vi.hoisted(() => ({ current: '/demo' }))
// Control carries steps 6 to 11; this suite works the step that holds its subject.
const search = vi.hoisted(() => ({ current: new URLSearchParams('step=9') }))
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useSearchParams: () => search.current,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

const settle = () =>
  act(() => {
    vi.advanceTimersByTime(2_000)
  })

const show = (node: React.ReactNode) =>
  render(<FleetProvider demonstration={PINNED_DEMONSTRATION}>{node}</FleetProvider>)

beforeEach(() => {
  clearLogbook()
  pathname.current = '/demo'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Settings, with the records and keyboard panels gone', () => {
  it('offers no route out of the browser and no way to wipe it', () => {
    show(<SettingsScreen />)
    settle()

    expect(screen.queryByRole('button', { name: /Export/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Import/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Clear everything/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Your records/)).not.toBeInTheDocument()
  })

  it('says nothing about a keyboard it no longer documents', () => {
    show(<SettingsScreen />)
    settle()

    expect(screen.queryByText(/Ctrl/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Jump to any Drone/)).not.toBeInTheDocument()
  })

  /*
   * It keeps two blocks and stays a real screen. A Settings page that had become an empty
   * frame would be its own defect, and the deletion is the change most likely to cause one.
   */
  it('is still a screen with something on it', () => {
    show(<SettingsScreen />)
    settle()

    expect(screen.getByText('The ground station')).toBeInTheDocument()
    expect(screen.getByText(/These make the simulated Fleet misbehave/)).toBeInTheDocument()
  })

  /*
   * Where records live is a Settings question, and this is the only screen that answers it.
   * The same two paragraphs used to be printed on Lesson, Reports and Students as well,
   * where they were documentation on top of a working screen.
   */
  it('is the one screen that says where records live', () => {
    show(<SettingsScreen />)
    settle()

    expect(screen.getByRole('note')).toHaveTextContent(/this browser on this laptop/)
    expect(screen.getByRole('note')).toHaveTextContent(/copy also goes to Vercel/)
  })
})

describe('ending a lesson with a large logbook', () => {
  /*
   * The strip is rendered directly rather than reached through `ControlScreen`.
   *
   * Going through the screen would prove nothing: `ControlScreen` renders the strip only
   * while a lesson is running, so ending one unmounts the strip and takes any prompt with it
   * before a query could see it — this test passed against the old markup for that reason
   * alone until it was rewritten. Held in place, the strip has to answer for itself.
   */
  it('raises no warning it has no remedy for', () => {
    // Comfortably past the two megabytes that used to raise the warning.
    writeNote('ttf-0001', 'x'.repeat(2_100_000), 1)
    startLesson('Year 8', 5, 6, 1_000)
    const lesson = runningLesson(readLogbook())

    expect(lesson).not.toBeNull()
    render(<LessonStrip lesson={lesson!} events={[]} now={2_000} />)
    fireEvent.click(screen.getByRole('button', { name: /End the lesson/ }))

    expect(screen.queryByText(/getting large/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Export them now/ })).not.toBeInTheDocument()
  })
})
