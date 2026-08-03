/**
 * Fixed severities for Teacher-written lesson incidents.
 *
 * New notes pick from this list instead of free text. Records already saved with an
 * unknown string (or a word from an older board) stay readable via
 * `formatIncidentSeverity` — the raw text is shown rather than blanked or forced into
 * a bucket that would rewrite history.
 */

export const INCIDENT_SEVERITIES = ['attention', 'fault'] as const

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]

export const INCIDENT_SEVERITY_LABELS: Readonly<Record<IncidentSeverity, string>> = {
  attention: 'Needs attention',
  fault: 'Fault',
}

export function isIncidentSeverity(value: string): value is IncidentSeverity {
  return (INCIDENT_SEVERITIES as readonly string[]).includes(value)
}

/** Accept only a known fixed value; free text returns null. */
export function parseIncidentSeverity(value: string): IncidentSeverity | null {
  const trimmed = value.trim()
  return isIncidentSeverity(trimmed) ? trimmed : null
}

/**
 * Label for Reports and lists. Known codes become Teacher words; anything else — including
 * legacy free text — prints as written so old records stay readable.
 */
export function formatIncidentSeverity(value: string): string {
  if (isIncidentSeverity(value)) return INCIDENT_SEVERITY_LABELS[value]
  const trimmed = value.trim()
  return trimmed === '' ? 'Unspecified' : trimmed
}

export function defaultIncidentSeverity(): IncidentSeverity {
  return 'attention'
}
