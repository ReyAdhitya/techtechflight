/**
 * Fixed incident vocabulary for Teacher notes (#312 / F193).
 *
 * Records written before categories exist carry free text (or nothing). Display must
 * keep those readable — never force them into a bucket or hide them as blank.
 */

export const INCIDENT_CATEGORIES = [
  { id: 'collision', label: 'Collision / near miss' },
  { id: 'battery', label: 'Battery / power' },
  { id: 'link', label: 'Link / dropout' },
  { id: 'control', label: 'Control / handling' },
  { id: 'hardware', label: 'Hardware / airframe' },
  { id: 'other', label: 'Other' },
] as const

export type IncidentCategoryId = (typeof INCIDENT_CATEGORIES)[number]['id']

const BY_ID: ReadonlyMap<string, string> = new Map(
  INCIDENT_CATEGORIES.map((entry) => [entry.id, entry.label]),
)

export function isIncidentCategoryId(value: string): value is IncidentCategoryId {
  return BY_ID.has(value)
}

/**
 * How a stored category reads on screen.
 *
 * - missing / empty → "Uncategorised" (pre-vocabulary records)
 * - known id → the fixed label
 * - anything else → the raw string, so a free-text note from before this list stays readable
 */
export function labelIncidentCategory(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === '') {
    return 'Uncategorised'
  }
  const trimmed = value.trim()
  return BY_ID.get(trimmed) ?? trimmed
}
