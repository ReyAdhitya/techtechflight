import type { LessonRecord } from '@/lib/logbook'

/** Join a student display name to lesson assignment keys when present. */
export function studentIdsForLesson(lesson: LessonRecord): readonly string[] {
  if (!lesson.assignments) return []
  return [...new Set(Object.values(lesson.assignments))]
}
