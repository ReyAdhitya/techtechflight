import { describe, expect, it } from 'vitest'
import {
  defaultIncidentSeverity,
  formatIncidentSeverity,
  INCIDENT_SEVERITIES,
  isIncidentSeverity,
  parseIncidentSeverity,
} from './incident-severity'

describe('incident severity from a list', () => {
  it('exposes the fixed severities the form may choose', () => {
    expect(INCIDENT_SEVERITIES).toEqual(['attention', 'fault'])
    expect(defaultIncidentSeverity()).toBe('attention')
  })

  it('accepts only the fixed codes, not free text', () => {
    expect(isIncidentSeverity('attention')).toBe(true)
    expect(isIncidentSeverity('fault')).toBe(true)
    expect(isIncidentSeverity('critical')).toBe(false)
    expect(parseIncidentSeverity(' fault ')).toBe('fault')
    expect(parseIncidentSeverity('hit a desk')).toBeNull()
  })

  it('labels known codes and keeps old free-text records readable', () => {
    expect(formatIncidentSeverity('attention')).toBe('Needs attention')
    expect(formatIncidentSeverity('fault')).toBe('Fault')
    expect(formatIncidentSeverity('clipped the light fitting')).toBe('clipped the light fitting')
    expect(formatIncidentSeverity('')).toBe('Unspecified')
  })
})
