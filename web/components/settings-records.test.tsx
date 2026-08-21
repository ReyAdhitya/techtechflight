import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { clearLogbook, readLogbook, runningLesson, startLesson, writeNote } from '@/lib/logbook'
import { PINNED_DEMONSTRATION } from '@/test-support/fleet'
import { FleetProvider } from './FleetProvider'
import { LessonStrip } from './LessonStrip'
import { SettingsScreen } from './SettingsScreen'

/**
 * What Settings offers about records, and what it must never grow back.
 *
 * Export, Import and Clear everything were withdrawn when a Teacher's records lived in one
 * browser profile with no route out. **ADR-0035 reversed the premise:** the records are a file
 * on the laptop now, so there is a route out, and it is the two buttons the plan asks for --
 * Save a copy, and Export for a spreadsheet -- neither of which shows anybody a file path.
 *
 * What stays refused is **Clear everything**. A button that wipes a term of attendance from a
 * shared laptop is a button somebody presses by accident, and the file exists precisely so that
 * clearing browsing data cannot do it either.
 *
 * The half that is easy to get wrong is still the **orphan**. The lesson strip used to warn, at
 * the end of a heavy lesson, that the records were getting large, and offered an export there
 * and then. Telling a Teacher about a problem on a screen with no remedy on it is worse than
 * never mentioning it, so the warning stays gone: the remedy lives on Settings, where a Teacher
 * goes to deal with records rather than mid-lesson.
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
  it('offers the two ways out and no way to wipe it', () => {
    show(<SettingsScreen />)
    settle()

    expect(
      screen.getByRole('button', { name: /Save a copy of my records/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export for a spreadsheet/ })).toBeInTheDocument()

    /* Still refused: a term of attendance is not one press from gone on a shared laptop. */
    expect(screen.queryByRole('button', { name: /Clear everything/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Import/ })).not.toBeInTheDocument()
  })

  /* No Teacher is ever told a file path. They press a button and a file appears. */
  it('names no file path', () => {
    show(<SettingsScreen />)
    settle()

    expect(screen.queryByText(/records\.db/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Documents\\/)).not.toBeInTheDocument()
  })

  /* Off until somebody ticks it, so the sentence a school is told is true on a fresh laptop. */
  it('leaves the off-site backup unticked', () => {
    show(<SettingsScreen />)
    settle()

    expect(screen.getByRole('checkbox', { name: /backup off the premises/ })).not.toBeChecked()
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
    expect(
      screen.getByRole('button', { name: /Set up a demonstration lesson/ }),
    ).toBeInTheDocument()
  })

  /*
   * Where records live is a Settings question, and this is the only screen that answers it.
   * The same two paragraphs used to be printed on Lesson, Reports and Students as well,
   * where they were documentation on top of a working screen.
   */
  it('is the one screen that says where records live', () => {
    show(<SettingsScreen />)
    settle()

    expect(screen.getByRole('note')).toHaveTextContent(/kept on this laptop/)
    expect(screen.getByRole('note')).toHaveTextContent(/Nothing is sent anywhere/)
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
