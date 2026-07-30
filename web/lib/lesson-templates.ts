export type LessonTemplate = { readonly id: string; readonly label: string; readonly exercises: readonly string[] }

export const LESSON_TEMPLATES: readonly LessonTemplate[] = [
  { id: 'hover-hold', label: 'Hover and hold', exercises: ['Take off', 'Hover 30s', 'Land'] },
  { id: 'pad-land', label: 'Pad landing', exercises: ['Find pad', 'Descend', 'Confirm QR'] },
  { id: 'formation', label: 'Pair formation', exercises: ['Link pair', 'Hold spacing', 'Land'] },
]
