'use client'

import {
  INCIDENT_CATEGORIES,
  type IncidentCategoryId,
} from '@/lib/incident-categories'

/**
 * Pick a fixed incident category (#312 / F193).
 *
 * Integrator mounts beside the incident note form / Reports filters. Empty means
 * uncategorised — the same answer records written before the vocabulary carry.
 */
export function IncidentCategorySelect({
  value,
  onChange,
  id = 'incident-category',
}: {
  readonly value: IncidentCategoryId | ''
  readonly onChange: (next: IncidentCategoryId | '') => void
  readonly id?: string
}) {
  return (
    <label className="flex min-w-[12rem] flex-col gap-1" htmlFor={id}>
      <span className="label">Category</span>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const next = event.target.value
          onChange(next === '' ? '' : (next as IncidentCategoryId))
        }}
        className="min-h-11 rounded-pill border border-hairline bg-canvas px-4 py-1.5 text-value text-ink"
      >
        <option value="">Uncategorised</option>
        {INCIDENT_CATEGORIES.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label}
          </option>
        ))}
      </select>
    </label>
  )
}
