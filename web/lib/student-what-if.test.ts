import { describe, expect, it } from 'vitest'
import type { VitalsAlert } from './vitals'
import { WHAT_IF_ANSWERS, whatIfFor, worstWhatIf } from './student-what-if'

/**
 * The four situations the Student poster names, which the app answered for none of.
 *
 * It printed the battery percentage and never said what to do with it, which is a reading
 * rather than an answer. Every one of these says what to do, never what is true.
 */

const alert = (kind: VitalsAlert['kind']): VitalsAlert => ({
  kind,
  severity: 'warning',
  text: 'whatever the board says',
  since: 0,
})

describe('what to do when something happens', () => {
  it('answers all four the poster names', () => {
    const kinds = Object.keys(WHAT_IF_ANSWERS)
    expect(kinds).toEqual(['low-battery', 'obstacle', 'new-target', 'missed-checkpoint'])
  })

  it('says what to do rather than what is true', () => {
    for (const answer of Object.values(WHAT_IF_ANSWERS)) {
      expect(answer.says.length, answer.kind).toBeGreaterThan(0)
      // A verb a child can act on, at the front of the sentence.
      expect(answer.says, answer.kind).toMatch(
        /^(Bring|Stop|Press|Turn|Land|Come|Go|Fly|Wait)/,
      )
    }
  })

  it('keeps the words short enough to read from two metres', () => {
    for (const answer of Object.values(WHAT_IF_ANSWERS)) {
      expect(answer.heading.length, answer.kind).toBeLessThanOrEqual(30)
      expect(answer.says.length, answer.kind).toBeLessThanOrEqual(80)
    }
  })

  /* One event, not two systems noticing separately. */
  it('is raised by the Alerts the board already raises', () => {
    expect(whatIfFor(alert('battery-low'))?.kind).toBe('low-battery')
    expect(whatIfFor(alert('low-endurance'))?.kind).toBe('low-battery')
    expect(whatIfFor(alert('obstacle'))?.kind).toBe('obstacle')
    expect(whatIfFor(alert('missed-checkpoint'))?.kind).toBe('missed-checkpoint')
  })

  it('has no opinion about an Alert that is not one of the four', () => {
    expect(whatIfFor(alert('separation'))).toBeNull()
    expect(whatIfFor(alert('no-response'))).toBeNull()
    expect(worstWhatIf([alert('separation'), alert('fault')])).toBeNull()
    expect(worstWhatIf([])).toBeNull()
  })

  it('takes the first of several, because the queue is already ranked', () => {
    expect(worstWhatIf([alert('obstacle'), alert('battery-low')])?.kind).toBe('obstacle')
  })
})
