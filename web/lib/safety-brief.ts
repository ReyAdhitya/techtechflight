/**
 * Fixed classroom safety brief — tickable rules that reset for each Lesson.
 *
 * Ticks live in localStorage keyed to the running Lesson id. A new Lesson (or no Lesson)
 * clears every tick so the brief never carries last period's marks into this one.
 */

export const SAFETY_BRIEF_KEY = 'techtechflight:safety-brief'

export const SAFETY_BRIEF_RULES = [
  {
    id: 'propellers',
    label: 'Keep fingers clear of propellers until the Teacher says go.',
  },
  {
    id: 'eyes',
    label: 'Eyes on your own craft. Call out if another is too close.',
  },
  {
    id: 'space',
    label: 'Stay behind the flight line unless you are flying.',
  },
  {
    id: 'stop',
    label: 'Stop means stop. Hands off the sticks at once.',
  },
  {
    id: 'land',
    label: 'Land when asked; do not argue with a Land or Stop call.',
  },
  {
    id: 'charge',
    label: 'Hand Drones back for charge. Never leave a pack in a bag.',
  },
] as const

export type SafetyBriefRuleId = (typeof SAFETY_BRIEF_RULES)[number]['id']

export type SafetyBriefState = {
  readonly lessonId: string | null
  readonly checked: Readonly<Partial<Record<SafetyBriefRuleId, boolean>>>
}

export function emptySafetyBrief(lessonId: string | null): SafetyBriefState {
  return { lessonId, checked: {} }
}

function isRuleId(value: string): value is SafetyBriefRuleId {
  return SAFETY_BRIEF_RULES.some((rule) => rule.id === value)
}

/** Load ticks for this Lesson; a different Lesson id (or none) resets the list. */
export function readSafetyBrief(lessonId: string | null): SafetyBriefState {
  if (typeof window === 'undefined') return emptySafetyBrief(lessonId)
  try {
    const raw = window.localStorage.getItem(SAFETY_BRIEF_KEY)
    if (!raw) return emptySafetyBrief(lessonId)
    const parsed = JSON.parse(raw) as {
      lessonId?: string | null
      checked?: Record<string, boolean>
    }
    if (parsed.lessonId !== lessonId) return emptySafetyBrief(lessonId)
    const checked: Partial<Record<SafetyBriefRuleId, boolean>> = {}
    for (const [id, value] of Object.entries(parsed.checked ?? {})) {
      if (isRuleId(id) && value === true) checked[id] = true
    }
    return { lessonId, checked }
  } catch {
    return emptySafetyBrief(lessonId)
  }
}

function writeSafetyBrief(state: SafetyBriefState): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SAFETY_BRIEF_KEY, JSON.stringify(state))
}

/** Flip one rule for the current Lesson. Changing Lesson id clears prior ticks first. */
export function toggleSafetyBriefRule(
  lessonId: string | null,
  ruleId: SafetyBriefRuleId,
): SafetyBriefState {
  const current = readSafetyBrief(lessonId)
  const nextChecked = { ...current.checked }
  if (nextChecked[ruleId]) delete nextChecked[ruleId]
  else nextChecked[ruleId] = true
  const next: SafetyBriefState = { lessonId, checked: nextChecked }
  writeSafetyBrief(next)
  return next
}

/** Clear every tick for this Lesson (or clear storage when there is none). */
export function resetSafetyBrief(lessonId: string | null): SafetyBriefState {
  const next = emptySafetyBrief(lessonId)
  writeSafetyBrief(next)
  return next
}

export function safetyBriefDoneCount(state: SafetyBriefState): number {
  return SAFETY_BRIEF_RULES.filter((rule) => state.checked[rule.id] === true).length
}
