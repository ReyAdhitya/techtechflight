import { describe, expect, it } from 'vitest'
import {
  INCIDENT_CATEGORIES,
  isIncidentCategoryId,
  labelIncidentCategory,
} from './incident-categories'

describe('incident categories', () => {
  it('offers a fixed vocabulary with stable ids', () => {
    expect(INCIDENT_CATEGORIES.length).toBeGreaterThanOrEqual(4)
    expect(new Set(INCIDENT_CATEGORIES.map((entry) => entry.id)).size).toBe(
      INCIDENT_CATEGORIES.length,
    )
    expect(isIncidentCategoryId('battery')).toBe(true)
    expect(isIncidentCategoryId('not-a-category')).toBe(false)
  })

  it('labels known ids and keeps pre-vocabulary records readable', () => {
    expect(labelIncidentCategory('collision')).toBe('Collision / near miss')
    expect(labelIncidentCategory(undefined)).toBe('Uncategorised')
    expect(labelIncidentCategory('')).toBe('Uncategorised')
    expect(labelIncidentCategory('Prop clipped the desk')).toBe('Prop clipped the desk')
  })
})
