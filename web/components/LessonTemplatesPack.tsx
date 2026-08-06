'use client'
import { LESSON_TEMPLATES } from '@/lib/lesson-templates'

export function LessonTemplatesPack({ onPick }: { onPick: (label: string, exercises: readonly string[]) => void }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Lesson templates">
      {LESSON_TEMPLATES.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            className="min-h-11 w-full rounded-surface border border-hairline bg-surface-1 px-4 py-2 text-left text-body text-ink"
            onClick={() => onPick(t.label, t.exercises)}
          >
            {t.label}
            <span className="mt-1 block text-value text-ink-subtle">{t.exercises.join(', ')}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
