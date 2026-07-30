import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  addLessonBookmark,
  clearLogbook,
  readLogbook,
  startLesson,
} from '@/lib/logbook'
import { LessonBookmarkControl } from './LessonBookmarkControl'

describe('LessonBookmarkControl', () => {
  beforeEach(() => clearLogbook())

  it('saves a bookmark with optional note into the running lesson', () => {
    startLesson('Year 8', 6, 6, 1_000)
    const lesson = readLogbook().lessons[0]!
    render(
      <LessonBookmarkControl
        lessonId={lesson.id}
        startedAt={lesson.startedAt}
        now={61_000}
        bookmarks={[]}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark moment' }))
    fireEvent.change(screen.getByPlaceholderText('Optional note'), {
      target: { value: 'Good formation' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save bookmark' }))
    expect(readLogbook().lessons[0]?.bookmarks).toEqual([
      { at: 61_000, note: 'Good formation' },
    ])
  })

  it('lists recent bookmarks newest first', () => {
    startLesson('Test', 1, 1, 0)
    const lesson = readLogbook().lessons[0]!
    addLessonBookmark(lesson.id, 10_000)
    addLessonBookmark(lesson.id, 20_000, 'Second')
    render(
      <LessonBookmarkControl
        lessonId={lesson.id}
        startedAt={0}
        now={30_000}
        bookmarks={readLogbook().lessons[0]?.bookmarks ?? []}
      />,
    )
    expect(screen.getByText(/Second/)).toBeInTheDocument()
  })
})
