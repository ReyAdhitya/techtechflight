'use client'

import {
  defaultIncidentSeverity,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_LABELS,
  type IncidentSeverity,
} from '@/lib/incident-severity'

/**
 * Fixed severity list for the incident form — replaces free-text severity.
 *
 * Reports should render stored values through `formatIncidentSeverity` so legacy strings
 * remain readable. This control only emits known codes.
 */
export function IncidentSeveritySelect({
  value = defaultIncidentSeverity(),
  onChange,
  id = 'incident-severity',
}: {
  readonly value?: IncidentSeverity
  readonly onChange: (severity: IncidentSeverity) => void
  readonly id?: string
}) {
  return (
    <label className="flex min-w-[12rem] flex-col gap-1">
      <span className="label">Severity</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as IncidentSeverity)}
        className="min-h-11 max-w-md rounded-pill border border-hairline bg-canvas px-3 py-1 text-value text-ink"
      >
        {INCIDENT_SEVERITIES.map((severity) => (
          <option key={severity} value={severity}>
            {INCIDENT_SEVERITY_LABELS[severity]}
          </option>
        ))}
      </select>
    </label>
  )
}
